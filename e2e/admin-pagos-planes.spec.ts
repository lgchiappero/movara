import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// Pagos a proveedores: registros directos (sin plan de cuotas). Setup de
// cliente + unidad vía API; alta, edición y baja de pagos por la UI.
test.describe("Pagos — pago directo a proveedor", () => {
  let clienteId: string;
  let unidadId: string;
  let nombre: string;
  let pagos: string[];

  test.beforeEach(async ({ page }) => {
    pagos = [];
    page.on("response", async (r) => {
      if (r.request().method() === "POST" && r.ok() && /\/api\/admin\/pagos$/.test(r.url())) {
        pagos.push((await r.json()).id);
      }
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
    for (const id of pagos) await page.request.delete(`/api/admin/cobranza/acuerdos/${id}`);
    await page.request.delete(`/api/admin/unidades/${unidadId}`);
    await page.request.delete(`/api/admin/clientes/${clienteId}`);
  });

  test("registrar pagos (pagado y pendiente), editarlos, y eliminarlos", async ({ page }) => {
    await page.goto("/admin/pagos");
    const fila = page.locator("tr", { hasText: nombre }).first();
    await expect(fila).toContainText("Sin pagos");

    // ── Pago pagado a fábrica ───────────────────────────────────────────
    await fila.getByRole("button", { name: "+ Pago" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo pago a proveedor" })).toBeVisible();
    await expect(page.getByText("+ Agregar cuota")).toHaveCount(0);
    await page.getByLabel("Proveedor").fill("Heshi");
    await expect(page.getByLabel("Descripción")).toHaveValue("Primera cuota fábrica");
    await page.getByLabel("Importe").fill("9000");
    await page.getByLabel("Fecha de pago").fill("2026-09-10");
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText("Pago a proveedor registrado")).toBeVisible();

    // ── Pago pendiente de seguro, más reciente ─────────────────────────
    await fila.getByRole("button", { name: "+ Pago" }).click();
    await page.getByLabel("Proveedor").fill("La Caja");
    await page.getByLabel("Concepto").selectOption("seguro");
    await page.getByLabel("Importe").fill("500");
    await page.getByLabel("Fecha de pago").fill("2026-12-01");
    await page.getByRole("group", { name: "Estado" }).getByText("Pendiente").click();
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText("Pago a proveedor registrado")).toBeVisible();

    await expect(fila).toContainText("Heshi");
    await expect(fila).toContainText("La Caja");
    await expect(fila).toContainText("USD 9.500"); // total
    await expect(fila).toContainText("USD 9.000"); // pagado
    await expect(fila).toContainText("Parcial");

    // ── Detalle: del más reciente al más viejo ──────────────────────────
    await fila.getByText(nombre).click();
    const detalle = page.getByTestId(`detalle-${unidadId}|USD`);
    const filasPagos = detalle.locator("tbody tr");
    await expect(filasPagos.nth(0)).toContainText("La Caja");
    await expect(filasPagos.nth(0)).toContainText("Pendiente");
    await expect(filasPagos.nth(1)).toContainText("Heshi");
    await expect(filasPagos.nth(1)).toContainText("Pagado");

    // ── Editar: el seguro pasa a pagado ─────────────────────────────────
    await filasPagos.nth(0).getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("heading", { name: "Editar pago a proveedor" })).toBeVisible();
    await page.getByRole("group", { name: "Estado" }).getByText("Pagado").click();
    await page.getByLabel("Fecha de pago").fill("2026-10-01");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Pago actualizado")).toBeVisible();
    await expect(fila).toContainText("Pagado");
    await expect(fila.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

    // ── Eliminar el pago de fábrica ─────────────────────────────────────
    await detalle.locator("tbody tr", { hasText: "Heshi" }).getByRole("button", { name: "Eliminar" }).click();
    await page
      .getByText("¿Eliminar este pago a proveedor?")
      .locator("..")
      .getByRole("button", { name: "Eliminar", exact: true })
      .click();
    await expect(page.getByText("Pago eliminado")).toBeVisible();
    await expect(fila).not.toContainText("Heshi");
    await expect(fila).toContainText("USD 500");
  });
});
