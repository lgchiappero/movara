import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Setup vía API (cliente, unidad, acuerdos y movimientos reales en la base);
// lo que se verifica es lo que muestran las grillas, leído de la tabla
// movimientos → acuerdos_pago → unidad.

const HOY = new Date().toISOString().slice(0, 10);

async function crearAcuerdo(page: Page, unidadId: string, tipo: "cobro" | "pago", concepto: string, total: number) {
  const res = await page.request.post("/api/admin/cobranza/acuerdos", {
    data: {
      tipo,
      unidadId,
      concepto,
      contraparte: tipo === "cobro" ? "Cliente E2E" : "Fábrica E2E",
      moneda: "USD",
      totalAcordado: total,
      cuotas: [{ descripcion: "Pago único", importe: total, vencimiento: null }],
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).id as string;
}

async function registrarMovimiento(page: Page, acuerdoId: string, importe: number): Promise<string> {
  const res = await page.request.post(`/api/admin/cobranza/acuerdos/${acuerdoId}/movimientos`, {
    multipart: { fecha: HOY, importe: String(importe), modalidad: "transferencia" },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).id as string;
}

function filaUnidad(page: Page, numeroUnidad: string) {
  return page.locator("tr", { hasText: numeroUnidad });
}

test.describe("Unidades — próximo paso y columnas de cobranza desde movimientos reales", () => {
  let unidadId: string;
  let clienteId: string;
  let numeroUnidad: string;
  const acuerdos: string[] = [];
  const movimientos: { acuerdoId: string; id: string }[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    const clienteRes = await page.request.post("/api/admin/clientes", {
      data: { nombre: `Cliente E2E Cobranza ${Date.now()}`, dni: null, cuit: null, domicilio: null, email: null, telefono: null, notas: null },
    });
    expect(clienteRes.ok()).toBeTruthy();
    clienteId = (await clienteRes.json()).id;

    const unidadRes = await page.request.post("/api/admin/unidades", {
      data: { clienteId, modelo: "Flex 38", precioCliente: 50000 },
    });
    expect(unidadRes.ok()).toBeTruthy();
    unidadId = (await unidadRes.json()).id;

    await page.goto(`/admin/unidades/${unidadId}`);
    numeroUnidad = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/MOV-UNIDAD-\d{4}-\d+/)![0];
  });

  // Un acuerdo con movimientos no se puede borrar — primero los movimientos.
  test.afterEach(async ({ page }) => {
    for (const m of movimientos.splice(0)) {
      await page.request.delete(`/api/admin/cobranza/acuerdos/${m.acuerdoId}/movimientos/${m.id}`);
    }
    for (const id of acuerdos.splice(0)) await page.request.delete(`/api/admin/cobranza/acuerdos/${id}`);
    await page.request.delete(`/api/admin/unidades/${unidadId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  test("sin cobros → 'Cobrar anticipo'; con cobro → 'Registrar pago a fábrica' y Cobrado/Fecha último cobro; con pago a fábrica → avanza", async ({ page }) => {
    const fechaHoy = new Date(`${HOY}T00:00:00Z`).toLocaleDateString("es-AR", { timeZone: "UTC" });

    // 1) Sin movimientos
    await page.goto("/admin/unidades");
    await expect(filaUnidad(page, numeroUnidad)).toContainText("Cobrar anticipo");
    await expect(filaUnidad(page, numeroUnidad)).toContainText("USD 0");

    // 2) Cobro de anticipo registrado, sin pago a fábrica
    const cobro = await crearAcuerdo(page, unidadId, "cobro", "anticipo", 50000);
    acuerdos.push(cobro);
    movimientos.push({ acuerdoId: cobro, id: await registrarMovimiento(page, cobro, 15000) });

    await page.goto("/admin/unidades");
    const fila = filaUnidad(page, numeroUnidad);
    await expect(fila).toContainText("Registrar pago a fábrica");
    await expect(fila).not.toContainText("Cobrar anticipo");
    await expect(fila).toContainText("USD 15.000");
    await expect(fila).toContainText(fechaHoy);

    await page.goto("/admin");
    const filaDashboard = filaUnidad(page, numeroUnidad);
    await expect(filaDashboard).toContainText("Registrar pago a fábrica");
    await expect(filaDashboard).toContainText("USD 15.000");
    await expect(filaDashboard).toContainText(fechaHoy);

    await page.goto(`/admin/unidades/${unidadId}`);
    // El pago a fábrica es un pago a proveedor → la acción lleva a la sección Pagos.
    await expect(page.getByRole("link", { name: /Registrar el pago a fábrica/ })).toHaveAttribute("href", "#pagos");
    // Ficha de la unidad: sección Cobranza (plan del cliente) y sección Pagos.
    const cobranza = page.locator("#cobranza");
    await expect(cobranza.getByRole("heading", { name: "Cobranza" })).toBeVisible();
    await expect(cobranza).toContainText("Plan de pago");
    await expect(cobranza).toContainText("USD 15.000"); // cobrado
    await expect(cobranza).toContainText("USD 35.000"); // saldo pendiente de la unidad
    const pagosSeccion = page.locator("#pagos");
    await expect(pagosSeccion.getByRole("heading", { name: "Pagos a proveedores" })).toBeVisible();
    await expect(pagosSeccion).toContainText("Todavía no hay pagos a proveedores cargados para esta unidad.");

    // 3) Segundo cobro y pago a fábrica registrados
    movimientos.push({ acuerdoId: cobro, id: await registrarMovimiento(page, cobro, 5000) });
    const pago = await crearAcuerdo(page, unidadId, "pago", "fabrica", 30000);
    acuerdos.push(pago);
    movimientos.push({ acuerdoId: pago, id: await registrarMovimiento(page, pago, 9000) });

    await page.goto(`/admin/unidades/${unidadId}`);
    await expect(page.locator("#pagos")).toContainText("Fábrica E2E · Fábrica");
    await expect(page.locator("#pagos")).toContainText("USD 9.000");

    await page.goto("/admin/unidades");
    await expect(filaUnidad(page, numeroUnidad)).toContainText("Iniciar producción");
    await expect(filaUnidad(page, numeroUnidad)).toContainText("USD 20.000");
  });
});
