import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Bug del 10/11/2026: después de registrar los pagos a proveedores, el
// dashboard seguía con la alerta "N unidades con pagos a proveedores
// vencidos". Los pagos se cargaban "Sin cuota específica" (la opción por
// defecto) y la alerta miraba Cuota.estado, que solo se recalculaba para la
// cuota elegida. Acá: plan de pago con una cuota vencida → la alerta suma
// esa unidad; pago parcial → sigue, con el saldo que resta; pago del resto
// desde la UI sin elegir cuota → la alerta vuelve a como estaba.
//
// La base de desarrollo puede tener otras unidades con pagos vencidos: se
// compara contra la cantidad de antes, no contra cero.

const ALERTA = /(\d+) unidad(?:es)? con pagos a proveedores vencidos/;

async function unidadesConPagoVencido(page: Page): Promise<number> {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const alerta = page.locator("li", { hasText: ALERTA });
  if ((await alerta.count()) === 0) return 0;
  return Number((await alerta.textContent())!.match(ALERTA)![1]);
}

test.describe("Dashboard — la alerta de pagos a proveedores vencidos sigue el saldo real", () => {
  let clienteId: string;
  let unidadId: string;
  let numeroUnidad: string;
  let planId: string | null;
  const pagos: string[] = [];

  test.beforeEach(async ({ page }) => {
    planId = null;
    page.on("response", async (r) => {
      if (r.request().method() !== "POST" || !r.ok()) return;
      if (/\/api\/admin\/cobranza\/acuerdos\/[^/]+\/movimientos$/.test(r.url())) pagos.push((await r.json()).id);
    });
    await loginAsAdmin(page);
    const clienteRes = await page.request.post("/api/admin/clientes", {
      data: { nombre: `Cliente E2E Alertas ${Date.now()}`, dni: null, cuit: null, domicilio: null, email: null, telefono: null, notas: null },
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

  test.afterEach(async ({ page }) => {
    if (planId) {
      for (const id of pagos.splice(0)) await page.request.delete(`/api/admin/cobranza/acuerdos/${planId}/movimientos/${id}`);
      await page.request.delete(`/api/admin/cobranza/acuerdos/${planId}`);
    }
    await page.request.delete(`/api/admin/unidades/${unidadId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  test("registrar el pago sin cuota específica hace desaparecer la alerta", async ({ page }) => {
    const antes = await unidadesConPagoVencido(page);

    // Plan de fábrica: anticipo vencido hace un mes + saldo a futuro.
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const en60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const res = await page.request.post("/api/admin/cobranza/acuerdos", {
      data: {
        tipo: "pago",
        unidadId,
        concepto: "fabrica",
        contraparte: "Proveedor E2E",
        moneda: "USD",
        totalAcordado: 30000,
        cuotas: [
          { descripcion: "Anticipo 50%", importe: 15000, vencimiento: hace30 },
          { descripcion: "Saldo 50%", importe: 15000, vencimiento: en60 },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    planId = (await res.json()).id;
    expect(await unidadesConPagoVencido(page)).toBe(antes + 1);

    async function registrarPago(importe: string) {
      await page.goto("/admin/pagos");
      const fila = page.locator("tr[aria-expanded]", { hasText: numeroUnidad }).filter({ hasText: "Proveedor E2E" });
      await fila.click();
      await page.getByRole("button", { name: "Registrar pago realizado" }).first().click();
      await expect(page.getByLabel(/Cuota que salda/)).toHaveValue(""); // "Sin cuota específica"
      await page.getByLabel(/Importe \(USD\)/).fill(importe);
      await page.getByRole("button", { name: "Registrar pago realizado" }).last().click();
      await expect(page.getByText("Pago realizado registrado")).toBeVisible();
      // El guardado hace router.refresh(): esperar a que termine antes de
      // navegar (Firefox aborta el goto si se cruzan).
      await page.waitForLoadState("networkidle");
    }

    // Pago parcial: la unidad sigue alertando, con el saldo que resta.
    await registrarPago("5000");
    expect(await unidadesConPagoVencido(page)).toBe(antes + 1);
    if (antes === 0) {
      await expect(page.locator("li", { hasText: ALERTA })).toContainText("saldo vencido USD 10.000");
    }

    // El resto de la cuota vencida: la alerta vuelve a como estaba.
    await registrarPago("10000");
    expect(await unidadesConPagoVencido(page)).toBe(antes);
  });
});
