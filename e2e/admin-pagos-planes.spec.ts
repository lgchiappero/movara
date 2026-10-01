import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Pagos a proveedores: misma lógica que Cobranza, dirección opuesta. Setup
// de cliente + unidad vía API; plan a proveedor y pago realizado por la UI.
test.describe("Pagos — plan de pago a proveedor por unidad", () => {
  let clienteId: string;
  let unidadId: string;
  let nombre: string;
  let planes: string[];
  let pagos: { plan: string; id: string }[];

  test.beforeEach(async ({ page }) => {
    planes = [];
    pagos = [];
    page.on("response", async (r) => {
      if (r.request().method() !== "POST" || !r.ok()) return;
      const planCreado = r.url().match(/\/api\/admin\/cobranza\/acuerdos$/);
      const pagoCreado = r.url().match(/\/api\/admin\/cobranza\/acuerdos\/([^/]+)\/movimientos$/);
      if (planCreado) planes.push((await r.json()).id);
      if (pagoCreado) pagos.push({ plan: pagoCreado[1], id: (await r.json()).id });
    });
    await loginAsAdmin(page);
    nombre = `Cliente E2E Pagos ${Date.now()}`;
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
    for (const p of pagos) await page.request.delete(`/api/admin/cobranza/acuerdos/${p.plan}/movimientos/${p.id}`);
    for (const id of planes) await page.request.delete(`/api/admin/cobranza/acuerdos/${id}`);
    await page.request.delete(`/api/admin/unidades/${unidadId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  test("dos proveedores para la misma unidad, pago realizado y saldo por unidad", async ({ page }) => {
    await page.goto("/admin/pagos");
    const fila = page.locator("tr", { hasText: nombre }).first();
    await expect(fila).toContainText("Sin plan");

    // Plan a fábrica
    await fila.getByRole("button", { name: "+ Plan" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo plan de pago a proveedor" })).toBeVisible();
    await page.getByLabel("Proveedor", { exact: true }).fill("Heshi");
    await expect(page.getByLabel("Descripción", { exact: true })).toHaveValue("Primera cuota fábrica");
    await page.getByLabel(/Total acordado/).fill("30000");
    await page.getByLabel("Importe de la cuota 1").fill("9000");
    await page.getByRole("button", { name: "+ Agregar cuota" }).click();
    await page.getByLabel("Tipo de la cuota 2").selectOption("saldo");
    await page.getByLabel("Importe de la cuota 2").fill("21000");
    await page.getByRole("button", { name: "Crear plan de pago" }).click();
    await expect(page.getByText("Plan de pago creado")).toBeVisible();

    // Segundo proveedor (seguro) en la misma unidad — permitido en pagos
    await fila.getByRole("button", { name: "+ Plan" }).click();
    await page.getByLabel("Proveedor", { exact: true }).fill("La Caja");
    await page.getByLabel("Concepto").selectOption("seguro");
    await page.getByLabel(/Total acordado/).fill("500");
    await page.getByLabel("Tipo de la cuota 1").selectOption("saldo");
    await page.getByLabel("Importe de la cuota 1").fill("500");
    await page.getByRole("button", { name: "Crear plan de pago" }).click();
    await expect(page.getByText("Plan de pago creado")).toBeVisible();

    await expect(fila).toContainText("Heshi");
    await expect(fila).toContainText("La Caja");
    await expect(fila).toContainText("USD 30.500");

    // Pago realizado a fábrica desde el detalle
    await fila.getByText(nombre).click();
    const detalle = page.getByTestId(`detalle-${unidadId}|USD`);
    await expect(detalle).toContainText("Heshi · Fábrica");
    await expect(detalle).toContainText("Primera cuota fábrica");
    await expect(detalle).toContainText("La Caja · Seguro");
    await detalle
      .locator("div.bg-white", { hasText: "Heshi · Fábrica" })
      .getByRole("button", { name: "Registrar pago realizado" })
      .click();
    await page.getByLabel(/Cuota que salda/).selectOption({ label: "Anticipo — USD 9.000 — Pendiente" });
    await page.getByRole("button", { name: "Registrar pago realizado" }).last().click();
    await expect(page.getByText("Pago realizado registrado")).toBeVisible();

    await expect(fila).toContainText("En curso");
    await expect(fila).toContainText("USD 9.000"); // pagado
    await expect(fila).toContainText("USD 21.500"); // pendiente de la unidad
  });
});
