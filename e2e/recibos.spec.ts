import { test, expect } from "@playwright/test";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { loginAsAdmin } from "./helpers/login";

// Fuera de producción, los recibos de clientes con email @example.com mandan
// sus emails a esta bandeja local en vez de a Resend (ver
// src/lib/recibos/enviar-email.ts) — así el test cubre "crear → email →
// abrir link" sin enviar correos reales.
const OUTBOX = path.join(process.cwd(), ".storage-local", "outbox");

type EmailOutbox = { to: string; subject: string; html: string; adjuntos: { filename: string; bytes: number }[] };

async function emailsPara(destinatario: string): Promise<EmailOutbox[]> {
  const archivos = await readdir(OUTBOX).catch(() => [] as string[]);
  const emails = await Promise.all(
    archivos.filter((a) => a.endsWith(".json")).map(async (a) => JSON.parse(await readFile(path.join(OUTBOX, a), "utf8")) as EmailOutbox)
  );
  return emails.filter((e) => e.to === destinatario);
}

test.describe("Recibo en Conformidad", () => {
  test("crear → email → abrir link en el celular → confirmar → PDF → admin, unidad y documentos actualizados", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);

    // ── Datos: cliente con email de prueba + unidad con modelo ─────────
    const sufijo = `${Date.now()}-${test.info().project.name}`;
    const emailCliente = `recibo-${sufijo}@example.com`;
    const clienteRes = await page.request.post("/api/admin/clientes", {
      data: { nombre: `Cliente Recibo ${sufijo}`, dni: "30123456", cuit: null, domicilio: null, email: emailCliente, telefono: "+54 9 11 5555-0000", notas: null },
    });
    expect(clienteRes.ok()).toBeTruthy();
    const cliente = await clienteRes.json();
    const unidadRes = await page.request.post("/api/admin/unidades", { data: { clienteId: cliente.id, modelo: "Flex 38" } });
    expect(unidadRes.ok()).toBeTruthy();
    const { id: unidadId } = await unidadRes.json();

    // ── 1. El admin crea el recibo desde la ficha de la unidad ─────────
    await page.goto(`/admin/unidades/${unidadId}`);
    await page.locator("#recibo").getByRole("link", { name: "Crear recibo" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo Recibo en Conformidad" })).toBeVisible();
    await expect(page.getByLabel("Datos precargados")).toContainText(emailCliente);
    await page.getByPlaceholder("Dirección, localidad, provincia").fill("Ruta 34 km 230, Sunchales, Santa Fe");
    await page.getByRole("button", { name: "Crear y enviar al cliente" }).click();

    await expect(page.getByText("Le enviamos al cliente el email con el link de confirmación.")).toBeVisible();
    const numeroRecibo = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/REC-\d{4}-\d{3}/)![0];
    const detalleUrl = page.url().split("?")[0];
    await expect(page.getByText("Pendiente").first()).toBeVisible();

    // ── 2. El email llegó con el botón de confirmación ─────────────────
    await expect.poll(async () => (await emailsPara(emailCliente)).length).toBeGreaterThan(0);
    const [solicitud] = await emailsPara(emailCliente);
    expect(solicitud.subject).toBe(`Confirmá la recepción de tu MOVARA · ${numeroRecibo}`);
    expect(solicitud.html).toContain("Confirmo que recibí la unidad en conformidad");
    const link = solicitud.html.match(/href="(https?:\/\/[^"]+\/recibo\/[a-f0-9]{64})"/)![1];
    const token = link.split("/").pop()!;

    // ── 3. El cliente abre el link en el celular ───────────────────────
    const celular = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const cliente2 = await celular.newPage();
    await cliente2.goto(`/recibo/${token}`);
    await expect(cliente2.getByRole("heading", { name: "Recibo en Conformidad de Entrega" })).toBeVisible();
    await expect(cliente2.getByLabel("Texto del Recibo en Conformidad")).toContainText(`Nº ${numeroRecibo}`);
    await expect(cliente2.getByLabel("Texto del Recibo en Conformidad")).toContainText("garantía de 12 meses");

    // Abrir la página NO confirma (los escáneres de correo abren los links solos).
    await cliente2.reload();
    await expect(cliente2.getByRole("button", { name: "Confirmar recepción en conformidad" })).toBeVisible();
    const pdfAntes = await cliente2.request.get(`/api/recibos/${token}/pdf`);
    expect(pdfAntes.status()).toBe(404);

    // ── 4. Confirma ────────────────────────────────────────────────────
    await cliente2.getByRole("button", { name: "Confirmar recepción en conformidad" }).click();
    await expect(cliente2.getByRole("heading", { name: "Recepción confirmada" })).toBeVisible({ timeout: 30_000 });
    await expect(cliente2.getByText(/Tu garantía está vigente hasta el/)).toBeVisible();
    await expect(cliente2.getByText(emailCliente)).toBeVisible();

    const pdf = await cliente2.request.get(`/api/recibos/${token}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

    // Recargar muestra el estado confirmado; una segunda confirmación da 409.
    await cliente2.reload();
    await expect(cliente2.getByRole("link", { name: "Descargar recibo (PDF)" })).toBeVisible();
    const segunda = await cliente2.request.post(`/api/recibos/${token}/confirmar`, { data: { confirmo: true } });
    expect(segunda.status()).toBe(409);
    await celular.close();

    // ── 5. Copias con el PDF al cliente y a MOVARA ─────────────────────
    const deCliente = await emailsPara(emailCliente);
    const confirmacion = deCliente.find((e) => e.subject === `Tu Recibo en Conformidad · ${numeroRecibo}`);
    expect(confirmacion?.adjuntos[0].filename).toBe(`Recibo en Conformidad ${numeroRecibo}.pdf`);
    const aMovara = (await emailsPara("contacto@movara.com.ar")).find((e) => e.subject.includes(numeroRecibo));
    expect(aMovara?.adjuntos).toHaveLength(1);

    // ── 6. Admin: recibo confirmado e íntegro ──────────────────────────
    await page.goto(detalleUrl);
    await expect(page.getByText("Confirmado").first()).toBeVisible();
    await expect(page.getByText(/✓ Íntegro/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Descargar PDF" })).toBeVisible();

    // ── 7. Unidad entregada, garantía activa y PDF en 07_entrega ──────
    await page.goto(`/admin/unidades/${unidadId}`);
    await expect(page.locator("#recibo")).toContainText("Confirmado");
    await expect(page.getByText(`Activada por el Recibo en Conformidad ${numeroRecibo}`)).toBeVisible();
    await expect(page.getByLabel("Garantía activada")).toBeChecked();
    const entrega = page
      .getByRole("heading", { name: "07 — Entrega" })
      .locator("xpath=ancestor::div[contains(@class,'bg-white')][1]");
    await expect(entrega.getByText(`Recibo en Conformidad ${numeroRecibo}.pdf`)).toBeVisible();

    // ── 8. Listado y ficha del cliente ─────────────────────────────────
    await page.goto("/admin/recibos");
    await expect(page.getByRole("link", { name: numeroRecibo })).toBeVisible();
    await page.goto(`/admin/clientes/${cliente.id}`);
    await expect(page.getByRole("heading", { name: "Recibos en Conformidad (1)" })).toBeVisible();
  });

  test("token inválido muestra el mensaje genérico", async ({ page }) => {
    await page.goto(`/recibo/${"0".repeat(64)}`);
    await expect(page.getByRole("heading", { name: "Link no válido" })).toBeVisible();
    await page.goto("/recibo/cualquier-cosa");
    await expect(page.getByRole("heading", { name: "Link no válido" })).toBeVisible();
  });
});
