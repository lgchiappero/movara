import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Cliente + unidad con precio, creados vía API para el setup. El flujo bajo
// prueba (elegir la unidad en el modal y ver el autocompletado) va por la UI.
async function crearUnidadConCliente(page: Page, precioCliente: number) {
  const nombre = `Cliente E2E Cobro ${Date.now()}`;
  const clienteRes = await page.request.post("/api/admin/clientes", {
    data: { nombre, dni: null, cuit: null, domicilio: null, email: null, telefono: null, notas: null },
  });
  expect(clienteRes.ok()).toBeTruthy();
  const cliente = await clienteRes.json();

  const unidadRes = await page.request.post("/api/admin/unidades", {
    data: { clienteId: cliente.id, precioCliente },
  });
  expect(unidadRes.ok()).toBeTruthy();
  const unidad = await unidadRes.json();
  return { nombre, clienteId: cliente.id as string, unidadId: unidad.id as string };
}

async function abrirModalYElegirUnidad(page: Page, boton: "+ Nuevo plan de pago" | "+ Nuevo pago", nombre: string) {
  await page.getByRole("button", { name: boton }).click();
  const buscador = page.getByPlaceholder("Buscar por N° de unidad o cliente...");
  await buscador.click();
  await buscador.fill(nombre);
  await page.getByRole("button", { name: new RegExp(nombre) }).click();
}

test.describe("Cobranza — autocompletado del modal Nuevo cobro/pago", () => {
  let datos: { nombre: string; clienteId: string; unidadId: string };

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    datos = await crearUnidadConCliente(page, 42000);
    await page.goto("/admin/cobranza");
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete(`/api/admin/unidades/${datos.unidadId}`);
    await page.request.delete(`/api/admin/clientes/${datos.clienteId}`);
  });

  test("cobro: elegir una unidad completa cliente y total, y el total se puede editar", async ({ page }) => {
    await abrirModalYElegirUnidad(page, "+ Nuevo plan de pago", datos.nombre);

    const cliente = page.getByLabel("Cliente", { exact: true });
    const total = page.getByLabel(/Total acordado/);
    await expect(cliente).toHaveValue(datos.nombre);
    await expect(total).toHaveValue("42000");

    await expect(total).toBeEditable();
    await total.fill("40000");
    await expect(total).toHaveValue("40000");
  });

  test("pago: elegir una unidad no completa proveedor ni monto", async ({ page }) => {
    await page.goto("/admin/pagos");
    await abrirModalYElegirUnidad(page, "+ Nuevo pago", datos.nombre);

    await expect(page.getByLabel("Proveedor", { exact: true })).toHaveValue("");
    await expect(page.getByLabel(/Total acordado/)).toHaveValue("");
  });
});
