import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

const basePatchBody = {
  estadoPedido: "confirmado",
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
  notasCliente: "Gracias por elegirnos",
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

async function getIdByNumeroConsulta(page: Page, numeroConsulta: string): Promise<string> {
  await page.goto("/admin/configuraciones");
  const row = page.locator("tr", { hasText: numeroConsulta });
  const href = await row.getByRole("link", { name: "Ver detalle" }).getAttribute("href");
  return href!.split("/").pop()!;
}

test.describe("/mi-pedido", () => {
  test("Test 1: sin link no hay buscador por código; un link inválido muestra error sin crashear", async ({ page }) => {
    await page.goto("/mi-pedido");
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Pedir mi link por WhatsApp/ })).toBeVisible();

    await page.goto(`/mi-pedido?t=${"0".repeat(64)}`);
    await expect(page.getByText("El link de seguimiento no es válido")).toBeVisible();
  });

  test("Test 2: el link con token muestra la línea de tiempo; el código correlativo ya no da acceso", async ({ page }) => {
    // Simula el submit real del configurador público — /admin/configuraciones
    // ya no crea nada, solo gestiona lo que llega desde ahí. Ruta pública.
    const seedRes = await page.request.post("/api/pedido", {
      data: {
        clienteNombre: "Playwright Mi Pedido",
        clienteWhatsapp: "+5491100000002",
        clienteEmail: "playwright@example.com",
        tipoCliente: "particular",
        modelo: "20ft",
        finalidad: "vivienda",
        provincia: "Buenos Aires",
        localidad: "La Plata",
        habitaciones: 2,
        incluyeCocina: true,
        tipoCocina: "electrico",
        incluyeBano: true,
        tipoAgua: "calefon-electrico",
        lavarropas: "bano",
        materiales: { exterior: "blanco", piso: "nogal-oscuro" },
        upgrades: [],
      },
    });
    const { numeroConsulta: seedNumeroConsulta, tokenSeguimiento } = await seedRes.json();
    expect(tokenSeguimiento).toMatch(/^[a-f0-9]{64}$/);

    // A partir de acá sí hace falta sesión (leer/editar en el panel admin).
    await loginAsAdmin(page);
    const id = await getIdByNumeroConsulta(page, seedNumeroConsulta);

    await page.request.patch(`/api/admin/configuraciones/${id}`, { data: basePatchBody });

    const numeroRes = await page.request.post(`/api/admin/configuraciones/${id}/numero`);
    const { numeroPedido } = await numeroRes.json();

    // El admin ve el link personal para mandárselo al cliente.
    await page.goto(`/admin/configuraciones/${id}`);
    await expect(page.getByLabel("Link de seguimiento")).toHaveValue(`https://movara.com.ar/mi-pedido?t=${tokenSeguimiento}`);

    // Los números correlativos ya no sirven para consultar un pedido.
    const porCodigo = await page.request.post("/api/mi-pedido", { data: { codigo: numeroPedido } });
    expect(porCodigo.status()).toBe(404);

    await page.goto(`/mi-pedido?t=${tokenSeguimiento}`);
    await expect(page.getByText("Playwright Mi Pedido")).toBeVisible();
    await expect(page.getByText("Confirmado")).toBeVisible();
    await expect(page.getByText("Gracias por elegirnos")).toBeVisible();
  });
});
