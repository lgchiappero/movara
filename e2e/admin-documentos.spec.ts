import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// playwright.config.ts ya carga .env.local (loadEnvConfig). Si ahí no hay
// credenciales de Supabase Storage, el upload real falla en el server — en
// ese caso mockeamos el POST de documentos desde el browser: lo que se prueba
// es el flujo de UI (elegir archivo, enviar a la sección correcta, sin
// errores), no que Supabase Storage responda.
const STORAGE_REAL = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

type UploadCapturado = { seccion: string; filename: string };

/** Intercepta POST /api/admin/unidades/:id/documentos y responde 201 sin
 * tocar el server. Devuelve los uploads capturados (sección + nombre de
 * archivo leídos del multipart) para poder verificar qué mandó la UI. */
async function mockUploadDocumentos(page: Page, unidadId: string): Promise<UploadCapturado[]> {
  const capturados: UploadCapturado[] = [];
  await page.route(`**/api/admin/unidades/${unidadId}/documentos`, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const seccion = /name="seccion"\r\n\r\n([^\r]*)/.exec(body)?.[1] ?? "";
    const filename = /name="file"; filename="([^"]*)"/.exec(body)?.[1] ?? "";
    capturados.push({ seccion, filename });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, id: `mock-${capturados.length}`, path: `mock/${filename}` }),
    });
  });
  return capturados;
}

// PDF mínimo válido — pasa validateFileMovara (tamaño > 0, mimeType
// application/pdf) sin necesitar un archivo real en disco.
const PDF_BYTES = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
);

test.describe("Upload de documentos en /admin/unidades", () => {
  test("Test 1: crear cliente + unidad, subir documentos en 01_cliente y 07_entrega", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Cliente y unidad de prueba se crean vía API (mismo patrón que el resto
    // del suite para el setup) — el flujo bajo prueba es la subida de
    // documentos, que sí se ejerce por la UI real más abajo.
    const suffix = Date.now();
    const clienteRes = await page.request.post("/api/admin/clientes", {
      data: {
        nombre: `Cliente E2E Documentos ${suffix}`,
        dni: null,
        cuit: null,
        domicilio: null,
        email: null,
        telefono: null,
        notas: null,
      },
    });
    expect(clienteRes.ok()).toBeTruthy();
    const cliente = await clienteRes.json();

    const unidadRes = await page.request.post("/api/admin/unidades", {
      data: { clienteId: cliente.id },
    });
    expect(unidadRes.ok()).toBeTruthy();
    const unidad = await unidadRes.json();

    const capturados = STORAGE_REAL ? null : await mockUploadDocumentos(page, unidad.id);

    await page.goto(`/admin/unidades/${unidad.id}`);
    await expect(page.getByRole("heading", { name: /Cliente E2E Documentos|MOV-/ }).first()).toBeVisible();

    // Cada SeccionCard es el div.bg-white más cercano por encima del título
    // — subimos por el DOM desde el heading en vez de depender de textos
    // hermanos, así no importa si otras tarjetas de la página también usan
    // "bg-white".
    // ── Sección 01 — Cliente ──────────────────────────────────────────
    const seccionCliente = page
      .getByRole("heading", { name: "01 — Cliente" })
      .locator("xpath=ancestor::div[contains(@class,'bg-white')][1]");
    await seccionCliente.locator('input[type="file"]').setInputFiles({
      name: "dni-cliente.pdf",
      mimeType: "application/pdf",
      buffer: PDF_BYTES,
    });
    await seccionCliente.getByRole("button", { name: "Subir archivo" }).click();
    await expectUploadOk(seccionCliente, "dni-cliente.pdf");

    // ── Sección 07 — Entrega ─────────────────────────────────────────
    const seccionEntrega = page
      .getByRole("heading", { name: "07 — Entrega" })
      .locator("xpath=ancestor::div[contains(@class,'bg-white')][1]");
    await seccionEntrega.locator('input[type="file"]').setInputFiles({
      name: "acta-entrega.pdf",
      mimeType: "application/pdf",
      buffer: PDF_BYTES,
    });
    await seccionEntrega.getByRole("button", { name: "Subir archivo" }).click();
    await expectUploadOk(seccionEntrega, "acta-entrega.pdf");

    if (capturados) {
      // Con Storage mockeado no hay fila en la DB que listar — verificamos
      // que cada archivo se mandó a su sección y a ninguna otra.
      expect(capturados).toEqual([
        { seccion: "01_cliente", filename: "dni-cliente.pdf" },
        { seccion: "07_entrega", filename: "acta-entrega.pdf" },
      ]);
    } else {
      // El documento de una sección no debe filtrarse a otra.
      await expect(seccionCliente.getByText("acta-entrega.pdf")).toHaveCount(0);
      await expect(seccionEntrega.getByText("dni-cliente.pdf")).toHaveCount(0);
    }

    /** Con Storage real, el documento aparece listado en su sección tras el
     * refresh. Mockeado, el éxito se ve en la UI como: botón vuelve a
     * "Subir archivo", sin mensaje de error y con el input limpio. */
    async function expectUploadOk(seccion: typeof seccionCliente, filename: string) {
      if (!capturados) {
        await expect(seccion.getByText(filename)).toBeVisible({ timeout: 15000 });
        return;
      }
      await expect(seccion.getByRole("button", { name: "Subir archivo" })).toBeEnabled({ timeout: 15000 });
      await expect(seccion.locator("p.text-red-600")).toHaveCount(0);
      await expect(seccion.locator('input[type="file"]')).toHaveValue("");
    }
  });
});
