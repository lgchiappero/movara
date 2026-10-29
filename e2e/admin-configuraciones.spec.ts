import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

const basePatchBody = {
  estadoPedido: "consulta",
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

function pedidoPayload(clienteNombre: string) {
  return {
    clienteNombre,
    clienteWhatsapp: "+5491100000001",
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
  };
}

/** Simula el submit del configurador público — es como llegan los registros
 * reales, ya que /admin/configuraciones ya no crea nada. Ruta pública, no
 * necesita sesión. */
async function seedPedido(page: Page, clienteNombre: string) {
  const res = await page.request.post("/api/pedido", { data: pedidoPayload(clienteNombre) });
  const json = await res.json();
  return { res, ...json };
}

test.describe("/admin/configuraciones", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Test 1: responde 200 con sesión válida", async ({ page }) => {
    const response = await page.goto("/admin/configuraciones");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Configuraciones de pedido" })
    ).toBeVisible();
  });

  test("Test 2: una consulta enviada desde /configurador aparece en el panel admin", async ({
    page,
  }) => {
    const { res, numeroConsulta } = await seedPedido(page, "Playwright Cliente Prueba");
    expect(res.status()).toBe(200);
    expect(numeroConsulta).toMatch(/^MOV-CONSULTA-\d{4}-\d{3}$/);

    await page.goto("/admin/configuraciones");
    // numeroConsulta es único por request — el nombre de cliente no lo es
    // entre corridas repetidas del suite, así que ubicamos la fila por él.
    const row = page.locator("tr", { hasText: numeroConsulta });
    await expect(row).toBeVisible();
    await expect(row.getByText("Playwright Cliente Prueba")).toBeVisible();
  });

  test("Test 3: el campo updatedAt existe y se actualiza en cada cambio", async ({ page }) => {
    const { numeroConsulta } = await seedPedido(page, "Playwright Cliente UpdatedAt");

    await page.goto("/admin/configuraciones");
    const row = page.locator("tr", { hasText: numeroConsulta });
    const href = await row.getByRole("link", { name: "Ver detalle" }).getAttribute("href");
    const id = href!.split("/").pop()!;

    const patch1 = await page.request.patch(`/api/admin/configuraciones/${id}`, {
      data: basePatchBody,
    });
    expect(patch1.status()).toBe(200);
    const json1 = await patch1.json();
    expect(json1.config.updatedAt).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const patch2 = await page.request.patch(`/api/admin/configuraciones/${id}`, {
      data: { ...basePatchBody, notasInternas: "cambio de prueba" },
    });
    const json2 = await patch2.json();

    expect(new Date(json2.config.updatedAt).getTime()).toBeGreaterThan(
      new Date(json1.config.updatedAt).getTime()
    );
  });
});

test.describe("/admin/configuraciones — pedido viejo con termotanque a gas", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("se ve como opción discontinuada y se guarda sin perder el valor", async ({ page }) => {
    const { numeroConsulta } = await seedPedido(page, "Playwright Termotanque Viejo");
    await page.goto("/admin/configuraciones");
    const href = await page.locator("tr", { hasText: numeroConsulta }).getByRole("link", { name: "Ver detalle" }).getAttribute("href");
    const id = href!.split("/").pop()!;

    // El configurador ya no lo ofrece: se simula un pedido viejo con ese valor.
    const materiales = Object.fromEntries(
      ["exterior", "piso", "panelesBano", "puertaBano", "cocina", "mesada", "puertaPrincipal", "ventanas"].map((k) => [k, null])
    );
    const viejo = await page.request.patch(`/api/admin/configuraciones/${id}/espacio`, {
      data: {
        modelo: "20ft",
        finalidad: "vivienda",
        provincia: "Buenos Aires",
        localidad: "La Plata",
        habitaciones: 2,
        incluyeCocina: true,
        tipoCocina: "electrico",
        incluyeBano: true,
        tipoAgua: "termotanque-gas",
        lavarropas: "bano",
        materiales,
        upgrades: [],
        notasConfiguracion: null,
      },
    });
    expect(viejo.status()).toBe(200);

    await page.goto(href!);
    const select = page.getByLabel("Tipo de agua caliente");
    await expect(select).toHaveValue("termotanque-gas");
    await expect(select.locator("option:checked")).toHaveText("Termotanque a gas (opción discontinuada)");
    await expect(page.getByText("Baño: Con baño — termotanque a gas (opción discontinuada)")).toBeVisible();

    await page.getByRole("button", { name: "Guardar configuración" }).click();
    await expect(page.getByText("Configuración guardada.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Tipo de agua caliente")).toHaveValue("termotanque-gas");
  });

  test("el configurador público ya no guarda termotanque a gas", async ({ page }) => {
    const res = await page.request.post("/api/pedido", {
      data: { ...pedidoPayload("Playwright Pagina Vieja"), tipoAgua: "termotanque-gas" },
    });
    expect(res.status()).toBe(200);
    const { numeroConsulta } = await res.json();
    await page.goto("/admin/configuraciones");
    await page.goto((await page.locator("tr", { hasText: numeroConsulta }).getByRole("link", { name: "Ver detalle" }).getAttribute("href"))!);
    await expect(page.getByLabel("Tipo de agua caliente")).toHaveValue("calefon-electrico");
    await expect(page.getByLabel("Tipo de agua caliente").locator("option")).toHaveText(["Sin definir", "Calefón eléctrico"]);
  });
});
