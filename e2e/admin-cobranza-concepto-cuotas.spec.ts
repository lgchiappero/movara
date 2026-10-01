import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Setup de cliente + unidad vía API; el alta del cobro (concepto,
// descripción, cuotas) y el selector de "Cuota que salda" van por la UI.
test.describe("Cobranza — concepto detallado y cuota que salda", () => {
  let clienteId: string;
  let unidadId: string;
  let nombre: string;
  const acuerdoIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    nombre = `Cliente E2E Cuotas ${Date.now()}`;
    const clienteRes = await page.request.post("/api/admin/clientes", {
      data: { nombre, dni: null, cuit: null, domicilio: null, email: null, telefono: null, notas: null },
    });
    expect(clienteRes.ok()).toBeTruthy();
    clienteId = (await clienteRes.json()).id;
    const unidadRes = await page.request.post("/api/admin/unidades", {
      data: { clienteId, modelo: "Flex 38", precioCliente: 24700 },
    });
    expect(unidadRes.ok()).toBeTruthy();
    unidadId = (await unidadRes.json()).id;
  });

  test.afterEach(async ({ page }) => {
    // El acuerdo creado no tiene movimientos → se puede borrar; después la
    // unidad y el cliente.
    for (const id of acuerdoIds.splice(0)) await page.request.delete(`/api/admin/cobranza/acuerdos/${id}`);
    await page.request.delete(`/api/admin/unidades/${unidadId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  test("crear un cobro con tipo de concepto + descripción y ver sus cuotas al registrar el pago", async ({ page }) => {
    page.on("response", async (r) => {
      if (r.url().endsWith("/api/admin/cobranza/acuerdos") && r.request().method() === "POST" && r.ok()) {
        acuerdoIds.push((await r.json()).id);
      }
    });

    await page.goto("/admin/cobranza");
    await page.getByRole("button", { name: "+ Nuevo cobro" }).click();

    // Paso 1 — unidad, tipo de concepto y descripción sugerida editable
    const buscador = page.getByPlaceholder("Buscar por N° de unidad o cliente...");
    await buscador.click();
    await buscador.fill(nombre);
    await page.getByRole("button", { name: new RegExp(nombre) }).click();
    await expect(page.getByLabel(/Total acordado/)).toHaveValue("24700");

    const tipoConcepto = page.getByLabel("Tipo de concepto");
    const descripcion = page.getByLabel("Descripción", { exact: true });
    await expect(tipoConcepto).toHaveValue("anticipo");
    await expect(descripcion).toHaveValue("Anticipo 30%");
    await tipoConcepto.selectOption("cuota");
    await expect(descripcion).toHaveValue("Cuota 1/3");
    await descripcion.fill("Cuota 2/3");
    await page.getByRole("button", { name: /Continuar/ }).click();

    // Paso 2 — dos cuotas
    await page.getByPlaceholder("Descripción de la cuota").first().fill("Anticipo 30%");
    await page.getByPlaceholder("Importe").first().fill("7410");
    await page.getByRole("button", { name: "+ Agregar cuota" }).click();
    await page.getByPlaceholder("Descripción de la cuota").nth(1).fill("Saldo final");
    await page.getByPlaceholder("Importe").nth(1).fill("17290");
    await page.getByRole("button", { name: "Crear cobro" }).click();
    await expect(page.getByText("Cobro creado")).toBeVisible();

    // La fila muestra el concepto nuevo
    const fila = page.locator("tr", { hasText: nombre }).first();
    await expect(fila).toContainText("Cuota");

    // Registrar pago recibido → "Cuota que salda" con las cuotas reales
    await fila.click();
    await page.getByRole("button", { name: "Registrar pago recibido" }).first().click();
    const selector = page.getByLabel(/Cuota que salda/);
    await expect(selector.locator("option")).toHaveText([
      "Sin cuota específica",
      "Anticipo 30% — USD 7.410 — Pendiente",
      "Saldo final — USD 17.290 — Pendiente",
    ]);
    await selector.selectOption({ label: "Anticipo 30% — USD 7.410 — Pendiente" });
    await expect(page.getByLabel(/Importe \(USD\)/)).toHaveValue("7410");
  });
});
