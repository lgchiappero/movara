import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Bug del 11/11/2026: la tarjeta decía "1 pago vencido" y la lista de
// vencidos estaba vacía. El contador sumaba los costos de logística
// pendientes con fecha pasada y la lista (pestaña "Por unidad") solo
// mostraba planes. Ahora la tarjeta, la alerta del dashboard y la lista
// ?estado=vencido salen de la misma función (src/lib/indicadores/pagos.ts):
// el número tiene que ser exactamente la cantidad de filas de la lista.
//
// La base de desarrollo puede tener otros vencidos: se compara número contra
// filas, y contra la cantidad de antes.

async function tarjetaVencidos(page: Page): Promise<number> {
  await page.goto("/admin/pagos");
  const tarjeta = page.getByRole("link", { name: /Pagos vencidos/ });
  return Number((await tarjeta.locator("p").last().textContent())!.trim());
}

async function filasDeLaLista(page: Page): Promise<number> {
  await page.goto("/admin/pagos?estado=vencido");
  const lista = page.getByTestId("pagos-vencidos");
  await expect(lista).toBeVisible();
  return lista.locator("tbody tr").count();
}

async function alertaDashboard(page: Page): Promise<number> {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const alerta = page.locator("li", { hasText: /pagos? a proveedores vencidos?/ });
  if ((await alerta.count()) === 0) return 0;
  return Number((await alerta.textContent())!.match(/(\d+) pagos? a proveedores/)![1]);
}

test.describe("Pagos vencidos — el número coincide con la lista", () => {
  let clienteId: string;
  let envioId: string;
  let unidadId: string;
  let costoId: string | null;

  test.beforeEach(async ({ page }) => {
    costoId = null;
    await loginAsAdmin(page);
    const sufijo = Date.now();
    envioId = (await (await page.request.post("/api/admin/envios")).json()).id;
    const vacio = {
      numeroPI: `PI-E2E-VENC-${sufijo}`,
      numeroBL: null,
      numeroContenedor: null,
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
    const cliente = await page.request.post("/api/admin/clientes", {
      data: { nombre: `Cliente E2E Vencidos ${sufijo}`, dni: null, cuit: null, domicilio: null, email: null, telefono: null, notas: null },
    });
    clienteId = (await cliente.json()).id;
    const unidad = await page.request.post("/api/admin/unidades", { data: { clienteId, envioId, modelo: "Flex 38", precioCliente: 50000 } });
    unidadId = (await unidad.json()).id;
  });

  test.afterEach(async ({ page }) => {
    if (costoId) await page.request.delete(`/api/admin/logistica/${costoId}`);
    await page.request.delete(`/api/admin/unidades/${unidadId}`);
    await page.request.delete(`/api/admin/envios/${envioId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  test("un costo de logística pendiente con fecha pasada cuenta y aparece en la lista, con su tipo", async ({ page }) => {
    const antes = await tarjetaVencidos(page);
    expect(await filasDeLaLista(page)).toBe(antes);
    expect(await alertaDashboard(page)).toBe(antes);

    const hace5dias = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    const res = await page.request.post("/api/admin/logistica", {
      multipart: {
        envioId,
        concepto: "despachante",
        descripcion: "Despachante E2E",
        moneda: "ARS",
        importe: "123456",
        fecha: hace5dias,
        estado: "pendiente",
      },
    });
    expect(res.ok()).toBeTruthy();
    costoId = (await res.json()).id;

    const despues = await tarjetaVencidos(page);
    expect(despues).toBe(antes + 1);
    expect(await filasDeLaLista(page)).toBe(despues);
    const fila = page.getByTestId("pagos-vencidos").locator("tbody tr", { hasText: "Despachante E2E" });
    await expect(fila).toContainText("Logística: Despachante");
    await expect(fila).toContainText("ARS 123.456");
    expect(await alertaDashboard(page)).toBe(despues);

    // El link de la alerta lleva a esa misma lista.
    await page.locator("li", { hasText: /a proveedores vencidos?/ }).getByRole("link", { name: "Ver →" }).click();
    await expect(page).toHaveURL(/\/admin\/pagos\?estado=vencido$/);
    await expect(page.getByTestId("pagos-vencidos").locator("tbody tr")).toHaveCount(despues);
  });
});
