import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Setup de cliente + unidad vía API. Todo el flujo de cobranza (crear el
// plan de pago, ver la unidad en la grilla, registrar un pago recibido y
// ver el saldo actualizado) va por la UI de /admin/cobranza.
test.describe("Cobranza — plan de pago por unidad", () => {
  let clienteId: string;
  let unidadId: string;
  let nombre: string;
  // Ids de lo que crea la UI durante el test — se capturan de las respuestas
  // para poder limpiar después.
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
    nombre = `Cliente E2E Plan ${Date.now()}`;
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

  // Limpieza vía API: pagos → planes → unidad → cliente (un plan con pagos
  // no se puede borrar).
  test.afterEach(async ({ page }) => {
    for (const p of pagos) await page.request.delete(`/api/admin/cobranza/acuerdos/${p.plan}/movimientos/${p.id}`);
    for (const id of planes) await page.request.delete(`/api/admin/cobranza/acuerdos/${id}`);
    await page.request.delete(`/api/admin/unidades/${unidadId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  function filaUnidad(page: Page) {
    return page.locator("tr", { hasText: nombre }).first();
  }

  test("crear el plan, registrar un pago recibido y ver el saldo de la unidad actualizado", async ({ page }) => {
    await page.goto("/admin/cobranza");
    const fila = filaUnidad(page);
    await expect(fila).toContainText("Sin plan");
    await expect(fila).toContainText("USD 24.700"); // valor total de la unidad

    // ── Crear el plan desde la fila ─────────────────────────────────────
    await fila.getByRole("button", { name: "Crear plan" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo plan de pago" })).toBeVisible();
    await expect(page.getByLabel(/Total acordado/)).toHaveValue("24700");
    await expect(page.getByLabel("Cliente", { exact: true })).toHaveValue(nombre);
    await page.getByLabel("Descripción", { exact: true }).fill("Venta Flex 38 en 3 cuotas");

    await page.getByLabel("Descripción de la cuota 1").fill("Anticipo 30%");
    await page.getByLabel("Importe de la cuota 1").fill("7410");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "+ Agregar cuota" }).click();
    await expect(page.getByLabel("Descripción de la cuota 4")).toHaveValue("Cuota 3/3");
    await page.getByLabel("Importe de la cuota 2").fill("5000");
    await page.getByLabel("Importe de la cuota 3").fill("6000");
    await page.getByLabel("Importe de la cuota 4").fill("6290");
    await page.getByLabel("Vencimiento de la cuota 2").fill("2026-12-01");
    await expect(page.getByText(/Suma de cuotas: USD 24.700 ✓/)).toBeVisible();
    await expect(page.getByLabel("Resumen del plan")).toContainText("Venta Flex 38 en 3 cuotas");
    await page.getByRole("button", { name: "Crear plan de pago" }).click();
    await expect(page.getByText("Plan de pago creado")).toBeVisible();

    // ── Grilla: resumen del plan y saldo ────────────────────────────────
    await expect(fila).toContainText("Anticipo + 3 cuotas");
    await expect(fila).toContainText("Pendiente");
    await expect(fila.getByRole("button", { name: "Crear plan" })).toHaveCount(0);

    // ── Registrar el anticipo ───────────────────────────────────────────
    await fila.getByRole("button", { name: "Registrar pago" }).click();
    await page.getByLabel(/Cuota que salda/).selectOption({ label: "Anticipo 30% — USD 7.410 — Pendiente" });
    await expect(page.getByLabel(/Importe \(USD\)/)).toHaveValue("7410");
    await expect(page.getByLabel("Fecha real del pago")).toBeVisible();
    await page.getByRole("button", { name: "Registrar pago recibido" }).click();
    await expect(page.getByText("Pago recibido registrado")).toBeVisible();

    await expect(fila).toContainText("En curso");
    await expect(fila).toContainText("USD 7.410"); // total cobrado
    await expect(fila).toContainText("USD 17.290"); // saldo pendiente de la unidad
    await expect(fila.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30");

    // ── Detalle: descripción del plan, cuotas y pagos recibidos ─────────
    await fila.getByText(nombre).click();
    const detalle = page.getByTestId(`detalle-${unidadId}|USD`);
    await expect(detalle).toContainText("Venta Flex 38 en 3 cuotas");
    await expect(detalle).toContainText("Valor de la unidad: USD 24.700");
    await expect(detalle).toContainText("Pagos recibidos");
    await expect(detalle.locator("tr", { hasText: "Anticipo 30%" }).first()).toContainText("Pagado");

    // ── Editar el plan: cambiar el total y agregar una cuota ───────────
    await detalle.getByRole("button", { name: "Editar plan" }).click();
    await expect(page.getByRole("heading", { name: "Editar plan de pago" })).toBeVisible();
    // El anticipo ya tiene pagos → no se puede eliminar (las demás sí).
    const cuotaPagada = page.getByText("Pagado USD 7.410").locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
    await expect(cuotaPagada.getByRole("button", { name: /Eliminar cuota/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Eliminar cuota/ })).toHaveCount(3);
    await page.getByLabel(/Total acordado/).fill("26000");
    await page.getByRole("button", { name: "+ Agregar cuota" }).click();
    await page.getByLabel("Descripción de la cuota 5").fill("Ajuste");
    await page.getByLabel("Importe de la cuota 5").fill("1300");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Plan de pago actualizado")).toBeVisible();
    await expect(fila).toContainText("USD 18.590"); // nuevo saldo: 26000 - 7410

    // ── Un solo plan por unidad: el modal no la ofrece ──────────────────
    await page.getByRole("button", { name: "+ Nuevo plan de pago" }).first().click();
    const buscador = page.getByPlaceholder("Buscar por N° de unidad o cliente...");
    await buscador.click();
    await buscador.fill(nombre);
    await expect(page.getByText("Ninguna unidad sin plan coincide")).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).click();

    // ── Eliminar el plan completo, con sus pagos ────────────────────────
    await detalle.getByRole("button", { name: "Eliminar plan" }).click();
    const dialogo = page.getByText("¿Eliminar el plan de pago completo?").locator("..");
    await expect(dialogo).toContainText("los 1 pago recibido registrado");
    await dialogo.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByText("Plan eliminado")).toBeVisible();
    await expect(fila).toContainText("Sin plan");
  });
});
