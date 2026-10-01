import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Pagos a proveedores: por unidad (fábrica + logística nacional, planes de
// cuotas) y logística internacional (por envío, prorrateable). Setup vía
// API (envío, cliente, 2 unidades en el envío); los flujos, por la UI.
test.describe("Pagos — por unidad y logística internacional", () => {
  let clienteId: string;
  let envioId: string;
  let unidades: string[];
  let nombre: string;
  let pi: string;
  let planes: string[];
  let pagos: { plan: string; id: string }[];
  let costos: string[];

  test.beforeEach(async ({ page }) => {
    planes = [];
    pagos = [];
    costos = [];
    page.on("response", async (r) => {
      if (r.request().method() !== "POST" || !r.ok()) return;
      const url = r.url();
      if (/\/api\/admin\/cobranza\/acuerdos$/.test(url)) planes.push((await r.json()).id);
      const pago = url.match(/\/api\/admin\/cobranza\/acuerdos\/([^/]+)\/movimientos$/);
      if (pago) pagos.push({ plan: pago[1], id: (await r.json()).id });
      if (/\/api\/admin\/logistica$/.test(url)) costos.push((await r.json()).id);
    });
    await loginAsAdmin(page);
    const sufijo = Date.now();
    nombre = `Cliente E2E Pagos ${sufijo}`;
    pi = `PI-E2E-${sufijo}`;

    const envioRes = await page.request.post("/api/admin/envios");
    envioId = (await envioRes.json()).id;
    const vacio = {
      numeroPI: pi,
      numeroBL: null,
      numeroContenedor: "MSCU0000001",
      fechaEmbarque: null,
      fechaArriboEstimado: null,
      fechaArribo: null,
      costoPI: null,
      costoFlete: null,
      costoSeguro: null,
      costoAduana: null,
      costoOtrosInternacional: null,
      notas: null,
    };
    expect((await page.request.patch(`/api/admin/envios/${envioId}`, { data: vacio })).ok()).toBeTruthy();

    const clienteRes = await page.request.post("/api/admin/clientes", {
      data: { nombre, dni: null, cuit: null, domicilio: null, email: null, telefono: null, notas: null },
    });
    clienteId = (await clienteRes.json()).id;
    unidades = [];
    for (let i = 0; i < 2; i++) {
      const res = await page.request.post("/api/admin/unidades", {
        data: { clienteId, envioId, modelo: "Flex 38", precioCliente: 50000 },
      });
      expect(res.ok()).toBeTruthy();
      unidades.push((await res.json()).id);
    }
  });

  test.afterEach(async ({ page }) => {
    for (const id of costos) await page.request.delete(`/api/admin/logistica/${id}`);
    for (const p of pagos) await page.request.delete(`/api/admin/cobranza/acuerdos/${p.plan}/movimientos/${p.id}`);
    for (const id of planes) await page.request.delete(`/api/admin/cobranza/acuerdos/${id}`);
    for (const id of unidades) await page.request.delete(`/api/admin/unidades/${id}`);
    await page.request.delete(`/api/admin/envios/${envioId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  async function numeroDe(page: Page, unidadId: string) {
    await page.goto(`/admin/unidades/${unidadId}`);
    return (await page.getByRole("heading", { level: 1 }).textContent())!.match(/MOV-UNIDAD-\d{4}-\d+/)![0];
  }

  test("por unidad: pago de fábrica con plan 50% + 50%, y registrar un pago realizado", async ({ page }) => {
    const numero = await numeroDe(page, unidades[0]);
    await page.goto("/admin/pagos");
    await expect(page.getByRole("tab", { name: /Por unidad/ })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "+ Nuevo pago a proveedor" }).click();

    const buscador = page.getByPlaceholder("Buscar por N° de unidad o cliente...");
    await buscador.click();
    await buscador.fill(numero);
    await page.getByRole("button", { name: new RegExp(numero) }).click();
    await page.getByLabel("Proveedor").fill("Heshi");
    await page.getByLabel(/Total acordado/).fill("30000");
    await expect(page.getByLabel("Descripción de la cuota 1")).toHaveValue("Anticipo 50% (al confirmar)");
    await expect(page.getByLabel("Importe de la cuota 1")).toHaveValue("15000");
    await expect(page.getByLabel("Importe de la cuota 2")).toHaveValue("15000");
    await page.getByRole("button", { name: "Crear pago a proveedor" }).click();
    await expect(page.getByText("Pago a proveedor creado")).toBeVisible();

    const fila = page.locator("tr[aria-expanded]", { hasText: numero }).filter({ hasText: "Heshi" });
    await expect(fila).toContainText("Fábrica");
    await expect(fila).toContainText("Pendiente");

    await fila.click();
    await page.getByRole("button", { name: "Registrar pago realizado" }).first().click();
    await page.getByLabel(/Cuota que salda/).selectOption({ label: "Anticipo 50% (al confirmar) — USD 15.000 — Pendiente" });
    await page.getByRole("button", { name: "Registrar pago realizado" }).last().click();
    await expect(page.getByText("Pago realizado registrado")).toBeVisible();
    await expect(fila).toContainText("Parcial");
    await expect(fila).toContainText("USD 15.000");
  });

  test("logística internacional: costo prorrateado desde el envío, visible en Pagos, en la unidad y en Rentabilidad", async ({ page }) => {
    const numero = await numeroDe(page, unidades[0]);

    // Cobro al cliente de la unidad 1 este mes (para la rentabilidad).
    const hoy = new Date().toISOString().slice(0, 10);
    const cobro = await page.request.post("/api/admin/cobranza/acuerdos", {
      data: {
        tipo: "cobro",
        unidadId: unidades[0],
        concepto: "venta",
        contraparte: nombre,
        moneda: "USD",
        totalAcordado: 50000,
        cuotas: [{ descripcion: "Anticipo", importe: 50000, vencimiento: null }],
      },
    });
    const cobroId = (await cobro.json()).id;
    planes.push(cobroId);
    const mov = await page.request.post(`/api/admin/cobranza/acuerdos/${cobroId}/movimientos`, {
      multipart: { fecha: hoy, importe: "10000", modalidad: "transferencia" },
    });
    pagos.push({ plan: cobroId, id: (await mov.json()).id });

    // ── Envío: nuevo costo, prorrateado entre las 2 unidades ────────────
    await page.goto(`/admin/envios/${envioId}`);
    const seccion = page.locator("#logistica");
    await seccion.getByRole("button", { name: "+ Nuevo costo de logística" }).click();
    await page.getByLabel("Importe total").fill("4200");
    await page.getByLabel("Fecha de pago").fill(hoy);
    await page.getByLabel(/Prorratear entre unidades del envío/).check();
    await expect(page.getByText("USD 4.200 ÷ 2 unidades = USD 2.100 c/u")).toBeVisible();
    await page.getByRole("button", { name: "Registrar costo" }).click();
    await expect(page.getByText("Costo de logística registrado")).toBeVisible();
    await expect(seccion.getByText("Total pagado").locator("..")).toContainText("USD 4.200");
    await expect(seccion).toContainText("Prorrateado ÷2");

    // ── Pagos → tab Logística internacional ─────────────────────────────
    await page.goto("/admin/pagos?tab=logistica");
    const filaCosto = page.locator("tr", { hasText: pi });
    await expect(filaCosto).toContainText("MSCU0000001");
    await expect(filaCosto).toContainText("Flete marítimo");
    await expect(filaCosto).toContainText("USD 4.200");
    await expect(filaCosto.getByRole("link", { name: pi })).toHaveAttribute("href", `/admin/envios/${envioId}`);

    // ── Ficha de la unidad: referencia de solo lectura ──────────────────
    await page.goto(`/admin/unidades/${unidades[0]}`);
    const ref = page.getByTestId("logistica-unidad");
    await expect(ref).toContainText("USD 2.100");
    await expect(ref.getByRole("button")).toHaveCount(0);
    await expect(ref.getByRole("link", { name: new RegExp(`Ver envío ${pi}`) })).toHaveAttribute("href", `/admin/envios/${envioId}#logistica`);

    // ── Rentabilidad: 10.000 cobrado − 2.100 logística internacional ────
    await page.goto("/admin/cobranza?tab=rentabilidad");
    const filaRent = page.locator("tr", { hasText: numero });
    await expect(filaRent).toContainText("USD 10.000");
    await expect(filaRent).toContainText("USD 2.100");
    await expect(filaRent).toContainText("USD 7.900");
  });
});
