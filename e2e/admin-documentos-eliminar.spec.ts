import { test, expect, type Page, type Locator } from "@playwright/test";
import { access } from "fs/promises";
import path from "path";
import { loginAsAdmin, loginAsVendedor } from "./helpers/login";

// Corre contra el storage local (CI y dev sin credenciales de Supabase):
// así se puede verificar que el archivo desaparece del disco.
const STORAGE_REAL = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_LOCAL = path.join(process.cwd(), ".storage-local", "documentos-movara");

const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

const existe = (p: string) => access(p).then(() => true, () => false);

function seccion(page: Page, titulo: string): Locator {
  return page.getByRole("heading", { name: titulo }).locator("xpath=ancestor::div[contains(@class,'bg-white')][1]");
}

/** Sube un PDF por la UI y devuelve el path en Storage que registró el server. */
async function subirPdf(page: Page, card: Locator, nombre: string, uploadPath: string): Promise<string> {
  await card.locator('input[type="file"]').setInputFiles({ name: nombre, mimeType: "application/pdf", buffer: PDF_BYTES });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === uploadPath),
    card.getByRole("button", { name: "Subir archivo" }).click(),
  ]);
  expect(res.status()).toBe(201);
  await expect(card.getByRole("status")).toHaveText("Archivo subido", { timeout: 15000 });
  await expect(card.getByText(nombre, { exact: true })).toBeVisible();
  return (await res.json()).path;
}

async function crearClienteYUnidad(page: Page, nombre: string) {
  const cliente = await (
    await page.request.post("/api/admin/clientes", {
      data: { nombre, dni: null, cuit: null, domicilio: null, email: null, telefono: null, notas: null },
    })
  ).json();
  const unidad = await (await page.request.post("/api/admin/unidades", { data: { clienteId: cliente.id } })).json();
  return { clienteId: cliente.id as string, unidadId: unidad.id as string };
}

test.describe("Eliminar documentos en el admin", () => {
  test.skip(STORAGE_REAL, "Se verifica el borrado contra el storage local");

  test("unidad: el admin elimina un documento con confirmación en la página; se borra el archivo y después la unidad y el cliente", async ({ page }) => {
    await loginAsAdmin(page);
    const { clienteId, unidadId } = await crearClienteYUnidad(page, `Cliente E2E Eliminar ${Date.now()}`);
    await page.goto(`/admin/unidades/${unidadId}`);
    const card = seccion(page, "01 — Cliente");
    const storagePath = await subirPdf(page, card, "dni-a-borrar.pdf", `/api/admin/unidades/${unidadId}/documentos`);
    expect(await existe(path.join(STORAGE_LOCAL, storagePath))).toBe(true);

    // Sin confirm() del navegador: si apareciera un diálogo nativo, el test falla.
    page.on("dialog", (d) => {
      throw new Error(`Apareció un diálogo del navegador: ${d.message()}`);
    });

    // Cancelar no borra nada.
    await card.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByRole("heading", { name: "¿Eliminar este documento?" })).toBeVisible();
    await expect(page.getByText('Se borra "dni-a-borrar.pdf" y su archivo. Esta acción no se puede deshacer.')).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(card.getByText("dni-a-borrar.pdf")).toBeVisible();

    // Confirmar: DELETE, aviso y el documento desaparece.
    await card.getByRole("button", { name: "Eliminar" }).click();
    const [del] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes(`/api/admin/unidades/${unidadId}/documentos/`)),
      page.locator(".fixed").getByRole("button", { name: "Eliminar" }).click(),
    ]);
    expect(del.status()).toBe(200);
    await expect(page.getByText("Documento eliminado")).toBeVisible();
    await expect(card.getByText("dni-a-borrar.pdf")).toHaveCount(0);
    expect(await existe(path.join(STORAGE_LOCAL, storagePath))).toBe(false);

    // Ya sin documentos, la unidad y el cliente se pueden eliminar.
    expect((await page.request.delete(`/api/admin/unidades/${unidadId}`)).status()).toBe(200);
    expect((await page.request.delete(`/api/admin/clientes/${clienteId}`)).status()).toBe(200);
  });

  test("envío: el admin elimina un documento de 05 — Embarque", async ({ page }) => {
    await loginAsAdmin(page);
    const envioId = (await (await page.request.post("/api/admin/envios")).json()).id as string;
    await page.goto(`/admin/envios/${envioId}`);
    const card = seccion(page, "05 — Embarque");
    const storagePath = await subirPdf(page, card, "bl-a-borrar.pdf", `/api/admin/envios/${envioId}/documentos`);

    await card.getByRole("button", { name: "Eliminar" }).click();
    await page.locator(".fixed").getByRole("button", { name: "Eliminar" }).click();
    await expect(card.getByText("bl-a-borrar.pdf")).toHaveCount(0);
    expect(await existe(path.join(STORAGE_LOCAL, storagePath))).toBe(false);
    await page.request.delete(`/api/admin/envios/${envioId}`);
  });

  test("vendedor: no ve el botón y la ruta DELETE le responde 403", async ({ page }) => {
    await loginAsAdmin(page);
    const { unidadId } = await crearClienteYUnidad(page, `Cliente E2E Vendedor ${Date.now()}`);
    const res = await page.request.post(`/api/admin/unidades/${unidadId}/documentos`, {
      multipart: { seccion: "01_cliente", file: { name: "contrato.pdf", mimeType: "application/pdf", buffer: PDF_BYTES } },
    });
    expect(res.status()).toBe(201);
    const { id: documentoId, path: storagePath } = await res.json();

    await loginAsVendedor(page);
    await page.goto(`/admin/unidades/${unidadId}`);
    const card = seccion(page, "01 — Cliente");
    await expect(card.getByText("contrato.pdf")).toBeVisible();
    await expect(card.getByRole("button", { name: "Eliminar" })).toHaveCount(0);

    const del = await page.request.delete(`/api/admin/unidades/${unidadId}/documentos/${documentoId}`, { failOnStatusCode: false });
    expect(del.status()).toBe(403);
    expect(await existe(path.join(STORAGE_LOCAL, storagePath))).toBe(true);
  });

  test("sin sesión la ruta DELETE responde 401", async ({ request }) => {
    const res = await request.delete("/api/admin/unidades/x/documentos/y", { failOnStatusCode: false });
    expect(res.status()).toBe(401);
  });
});
