import { test, expect, type Page } from "@playwright/test";

// /api/leads responde 503 cuando no pudo guardar la consulta en la base: los
// formularios de la home no pueden mostrar "recibido" y tienen que ofrecer
// WhatsApp con lo que la persona cargó. Se simula el 503 interceptando la
// ruta (no se escribe en la base ni se mandan emails).
const AVISO = "No pudimos registrar tu consulta. Escribinos por WhatsApp";

async function responderLeads(page: Page, status: number) {
  const pedidos: unknown[] = [];
  await page.route("**/api/leads", async (route) => {
    pedidos.push(route.request().postDataJSON());
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(status === 503 ? { error: AVISO, code: "lead-no-guardado" } : { ok: true }),
    });
  });
  return pedidos;
}

async function enlaceWhatsApp(page: Page, seccion: string) {
  const aviso = page.locator(seccion).getByRole("alert");
  await expect(aviso).toContainText(AVISO);
  const link = aviso.getByRole("link", { name: "Escribir por WhatsApp" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  return decodeURIComponent((await link.getAttribute("href"))!);
}

test.describe("Formularios de consulta — /api/leads no guarda (503)", () => {
  test("contacto: aviso + WhatsApp con la consulta, sin 'Mensaje recibido'", async ({ page }) => {
    const pedidos = await responderLeads(page, 503);
    await page.goto("/#contacto");
    const form = page.locator("#contacto form");
    await form.getByPlaceholder("Tu nombre").fill("Ana E2E");
    await form.getByPlaceholder("+54 9 11...").fill("+54 9 11 5555 4444");
    await form.locator("select").selectOption("Santa Fe");
    await form.getByPlaceholder(/Qué tipo de espacio/).fill("Quiero un Flex 38");
    await form.getByRole("button", { name: /Solicitar asesoramiento/ }).click();

    const href = await enlaceWhatsApp(page, "#contacto");
    expect(href).toMatch(/wa\.me|whatsapp/);
    expect(href).toContain("Soy Ana E2E, de Santa Fe.");
    expect(href).toContain("Quiero un Flex 38");
    await expect(page.getByText("¡Mensaje recibido!")).toHaveCount(0);
    expect(pedidos).toHaveLength(1);
  });

  test("dossier: aviso + WhatsApp, sin '¡Consulta recibida!'; con 201 sí confirma", async ({ page }) => {
    await responderLeads(page, 503);
    await page.goto("/#dossier");
    const dossier = page.locator("#dossier");
    await dossier.locator('select[name="provincia"]').selectOption("Córdoba");
    await dossier.getByRole("button", { name: /Continuar/ }).click();
    await dossier.getByRole("button", { name: /Continuar/ }).click();
    await dossier.getByPlaceholder("Tu nombre").fill("Ana");
    await dossier.getByPlaceholder("Tu apellido").fill("E2E");
    await dossier.getByPlaceholder("12345678").fill("30123456");
    await dossier.getByPlaceholder("+54 9 11...").fill("+54 9 11 5555 4444");
    await dossier.getByPlaceholder("tu@email.com").fill("ana.e2e@gmail.com");
    await dossier.getByRole("button", { name: "Quiero mi precio de lanzamiento" }).click();

    const href = await enlaceWhatsApp(page, "#dossier");
    expect(href).toContain("Soy Ana E2E, de Córdoba.");
    await expect(dossier.getByText("¡Consulta recibida!")).toHaveCount(0);

    // Reintento cuando la base vuelve: ahora sí confirma.
    await page.unroute("**/api/leads");
    await responderLeads(page, 201);
    await dossier.getByRole("button", { name: "Quiero mi precio de lanzamiento" }).click();
    await expect(dossier.getByText("¡Consulta recibida!")).toBeVisible();
  });
});
