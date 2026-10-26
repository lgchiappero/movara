import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Cliente y Lead automáticos: cada pedido del configurador crea o reutiliza
// el Cliente y el Lead, y el estado del cliente sigue al pedido más avanzado
// (con opción manual). Cada test usa un email único para no chocar con
// corridas anteriores.

const PATCH_BASE = {
  precioFinal: null,
  anticipo: null,
  numeroFabrica: null,
  numeroContenedor: null,
  numeroBL: null,
  fechaConfirmacion: null,
  fechaProduccion: null,
  fechaDespacho: null,
  fechaArriboEstimado: null,
  fechaEntrega: null,
  notasInternas: null,
  notasCliente: null,
  costoProveedor: null,
  costoFlete: null,
  costoAduana: null,
  costoOtros: null,
  vendedorAsignado: null,
  piProveedor: null,
  fechaPIPagado: null,
  montoPI: null,
  seguroTransporte: false,
  inspeccionFabrica: false,
  fotosDespachadas: false,
  notasDespachador: null,
  gastosDespachante: null,
  impuestosAduana: null,
  gastosPortuarios: null,
  costoGruaDescarga: null,
  costoTransporteLocal: null,
  instalacionFecha: null,
  instalacionNotas: null,
  satisfaccionCliente: null,
  garantiaActivada: false,
  garantiaFechaInicio: null,
};

function unico() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function pedidoPayload(email: string, nombre: string, extra: Record<string, unknown> = {}) {
  return {
    clienteNombre: nombre,
    clienteWhatsapp: `+54911${unico().slice(-8)}`,
    clienteEmail: email,
    tipoCliente: "particular",
    modelo: "20ft",
    finalidad: "vivienda",
    provincia: "Santa Fe",
    localidad: "Rafaela",
    habitaciones: 2,
    incluyeCocina: true,
    tipoCocina: "electrico",
    incluyeBano: true,
    tipoAgua: "calefon-electrico",
    lavarropas: "bano",
    materiales: {},
    upgrades: [],
    ...extra,
  };
}

/** Envía un pedido como el configurador y devuelve el id del pedido. */
async function enviarPedido(page: Page, email: string, nombre: string, extra: Record<string, unknown> = {}) {
  const res = await page.request.post("/api/pedido", { data: pedidoPayload(email, nombre, extra) });
  expect(res.status()).toBe(200);
  const { numeroConsulta, tokenSeguimiento } = await res.json();
  await page.goto("/admin/configuraciones");
  const href = await page.locator("tr", { hasText: numeroConsulta }).getByRole("link", { name: "Ver detalle" }).getAttribute("href");
  return { id: href!.split("/").pop()!, numeroConsulta: numeroConsulta as string, tokenSeguimiento: tokenSeguimiento as string };
}

/** Abre la ficha del pedido y sigue el link a su cliente; devuelve la URL. */
async function fichaDelCliente(page: Page, pedidoId: string) {
  await page.goto(`/admin/configuraciones/${pedidoId}`);
  await page.getByRole("link", { name: /ver ficha del cliente/i }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\/[^/]+$/);
  return page.url();
}

async function cambiarEstadoPedido(page: Page, id: string, estadoPedido: string) {
  const res = await page.request.patch(`/api/admin/configuraciones/${id}`, { data: { ...PATCH_BASE, estadoPedido } });
  expect(res.status()).toBe(200);
}

const chipEstado = (page: Page) => page.locator("h2", { hasText: "Estado" }).locator("xpath=following-sibling::span");

test.describe("Clientes automáticos", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("pedido nuevo → cliente 'Pedido iniciado' + lead en el pipeline", async ({ page }) => {
    const email = `e2e-nuevo-${unico()}@example.com`;
    const nombre = `E2E Nuevo ${unico()}`;
    const { id, numeroConsulta } = await enviarPedido(page, email, nombre);

    await fichaDelCliente(page, id);
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    await expect(chipEstado(page)).toHaveText("Pedido iniciado");
    await expect(page.getByText("Pedidos (1)")).toBeVisible();
    await expect(page.getByText(numeroConsulta)).toBeVisible();
    await expect(page.getByText("Consultas (1)")).toBeVisible();

    // En la lista, con su estado; los "pedido iniciado" van primero.
    await page.goto("/admin/clientes?estado=pedido_iniciado");
    await expect(page.locator("tr", { hasText: nombre }).getByText("Pedido iniciado")).toBeVisible();

    // El lead está en el pipeline, vinculado al cliente.
    await page.goto("/admin/pipeline");
    await page.locator("tr", { hasText: nombre }).getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByText("Vinculado a un cliente.")).toBeVisible();
  });

  test("segundo pedido del mismo email → mismo cliente y mismo lead", async ({ page }) => {
    const email = `e2e-repite-${unico()}@example.com`;
    const nombre = `E2E Repite ${unico()}`;
    const primero = await enviarPedido(page, email, nombre);
    const urlCliente = await fichaDelCliente(page, primero.id);

    const segundo = await enviarPedido(page, email.toUpperCase(), `${nombre} Bis`);
    expect(await fichaDelCliente(page, segundo.id)).toBe(urlCliente);
    await expect(page.getByText("Pedidos (2)")).toBeVisible();
    await expect(page.getByText("Consultas (1)")).toBeVisible();

    await page.goto("/admin/pipeline");
    await expect(page.locator("tr", { hasText: nombre })).toHaveCount(1);
  });

  test("pedido confirmado → 'Comprador'; cancelado no cuenta y no se ve en /mi-pedido", async ({ page }) => {
    const email = `e2e-confirma-${unico()}@example.com`;
    const { id, tokenSeguimiento } = await enviarPedido(page, email, `E2E Confirma ${unico()}`);
    await cambiarEstadoPedido(page, id, "confirmado");
    const urlCliente = await fichaDelCliente(page, id);
    await expect(chipEstado(page)).toHaveText("Comprador");

    // Cancelar desde la ficha del pedido, con motivo.
    await page.goto(`/admin/configuraciones/${id}`);
    await page.getByRole("button", { name: "Cancelar pedido" }).click();
    await page.getByLabel("Motivo (opcional)").fill("Prueba e2e");
    await page.getByRole("button", { name: "Confirmar cancelación" }).click();
    await expect(page.getByText("Pedido cancelado", { exact: true })).toBeVisible();
    await expect(page.getByText(/Motivo: Prueba e2e/)).toBeVisible();

    await page.goto(urlCliente);
    await expect(chipEstado(page)).toHaveText("Interesado");
    const miPedido = await page.request.post("/api/mi-pedido", { data: { token: tokenSeguimiento }, failOnStatusCode: false });
    expect(miPedido.status()).toBe(404);

    // Reactivar lo devuelve a "confirmado".
    await page.goto(`/admin/configuraciones/${id}`);
    await page.getByRole("button", { name: /Reactivar pedido \(vuelve a «Confirmado»\)/ }).click();
    await expect(page.getByRole("button", { name: "Cancelar pedido" })).toBeVisible();
    await page.goto(urlCliente);
    await expect(chipEstado(page)).toHaveText("Comprador");
  });

  test("cambio manual; un avance posterior lo actualiza; volver a automático", async ({ page }) => {
    const email = `e2e-manual-${unico()}@example.com`;
    const { id } = await enviarPedido(page, email, `E2E Manual ${unico()}`);
    const urlCliente = await fichaDelCliente(page, id);

    await page.getByLabel("Estado del cliente").selectOption("presupuestado");
    await expect(chipEstado(page)).toHaveText("Presupuestado · manual");
    await expect(page.getByText(/Fijado a mano por/)).toBeVisible();

    // Un avance que no supera al manual no lo toca.
    await cambiarEstadoPedido(page, id, "presupuestado");
    await page.goto(urlCliente);
    await expect(chipEstado(page)).toHaveText("Presupuestado · manual");

    // Uno que lo supera lo actualiza y deja de ser manual.
    await cambiarEstadoPedido(page, id, "confirmado");
    await page.goto(urlCliente);
    await expect(chipEstado(page)).toHaveText("Comprador");

    // Manual de nuevo y "Volver a automático".
    await page.getByLabel("Estado del cliente").selectOption("entregado");
    await expect(chipEstado(page)).toHaveText("Entregado · manual");
    await page.getByRole("button", { name: "Volver a automático" }).click();
    await expect(chipEstado(page)).toHaveText("Comprador");
    await expect(page.getByRole("button", { name: "Volver a automático" })).toHaveCount(0);
  });

  test("origen de la visita: se guarda en el navegador y llega al cliente y al lead", async ({ page }) => {
    const guardado = () => page.evaluate(() => JSON.parse(localStorage.getItem("movara_origen") ?? "null")?.datos);
    await page.goto("/?utm_source=facebook&utm_medium=paid&utm_campaign=e2e-campana");
    // Se guarda al hidratar la página.
    await expect.poll(guardado).toMatchObject({ utm_source: "facebook", utm_medium: "paid", utm_campaign: "e2e-campana", landing: "/" });
    const origen = await guardado();

    // Una visita posterior con otra campaña no pisa la primera.
    await page.goto("/modelos?utm_source=google&utm_medium=cpc");
    await page.waitForLoadState("networkidle");
    expect((await guardado()).utm_campaign).toBe("e2e-campana");

    const nombre = `E2E Origen ${unico()}`;
    const { id } = await enviarPedido(page, `e2e-origen-${unico()}@example.com`, nombre, { origen });
    await fichaDelCliente(page, id);
    await expect(page.getByText("Meta Ads")).toBeVisible();
    await expect(page.getByText("e2e-campana")).toBeVisible();

    await page.goto("/admin/clientes?origenVisita=meta_ads");
    await expect(page.locator("tr", { hasText: nombre })).toBeVisible();
    await page.goto("/admin/pipeline?origenVisita=meta_ads");
    await expect(page.locator("tr", { hasText: nombre }).getByText("Meta Ads")).toBeVisible();
  });

  test("formulario de contacto: crea o reutiliza el cliente 'Interesado'", async ({ page }) => {
    const email = `e2e-contacto-${unico()}@example.com`;
    const nombre = `E2E Contacto ${unico()}`;
    const res = await page.request.post("/api/leads", {
      data: { nombre, telefono: `+54911${unico().slice(-8)}`, email, mensaje: "Hola", formulario: "contacto" },
      headers: { "x-forwarded-for": `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    });
    expect(res.status()).toBe(201);
    await page.goto("/admin/clientes?estado=interesado");
    await page.locator("tr", { hasText: nombre }).getByRole("link", { name: "Ver detalle" }).click();
    await expect(chipEstado(page)).toHaveText("Interesado");
    await expect(page.getByText("Consultas (1)")).toBeVisible();

    // Después hace un pedido con el mismo email: mismo cliente, pasa a "Pedido iniciado".
    const urlCliente = page.url();
    const { id } = await enviarPedido(page, email, nombre);
    expect(await fichaDelCliente(page, id)).toBe(urlCliente);
    await expect(chipEstado(page)).toHaveText("Pedido iniciado");
    await expect(page.getByText("Consultas (1)")).toBeVisible();
  });
});
