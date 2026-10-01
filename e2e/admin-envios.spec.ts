import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

const VACIO = {
  numeroPI: null,
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

async function cargarYGuardar(page: Page, valores: { pi: string; bl: string; contenedor: string }) {
  await page.getByLabel("N° PI").fill(valores.pi);
  await page.getByLabel("N° BL").fill(valores.bl);
  await page.getByLabel("N° Contenedor").fill(valores.contenedor);

  const respuesta = page.waitForResponse(
    (r) => r.url().includes("/api/admin/envios/") && r.request().method() === "PATCH"
  );
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  expect((await respuesta).status()).toBe(200);
  await expect(page.getByText("Guardado correctamente")).toBeVisible();
}

async function verificarPersistencia(page: Page, valores: { pi: string; bl: string; contenedor: string }) {
  await page.reload();
  await expect(page.getByLabel("N° PI")).toHaveValue(valores.pi);
  await expect(page.getByLabel("N° BL")).toHaveValue(valores.bl);
  await expect(page.getByLabel("N° Contenedor")).toHaveValue(valores.contenedor);
  await expect(page.getByRole("heading", { name: `Envío ${valores.pi}` })).toBeVisible();
}

test.describe("Envíos — PI, BL y contenedor persisten", () => {
  let envioId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    const res = await page.request.post("/api/admin/envios");
    expect(res.ok()).toBeTruthy();
    envioId = (await res.json()).id;
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete(`/api/admin/envios/${envioId}`);
  });

  test("envío nuevo: cargar PI, BL y contenedor, guardar y recargar", async ({ page }) => {
    const valores = { pi: `PI-E2E-${Date.now()}`, bl: "BL-E2E-456", contenedor: "MSCU1234567" };
    await page.goto(`/admin/envios/${envioId}`);
    await cargarYGuardar(page, valores);
    await verificarPersistencia(page, valores);
  });

  test("envío con fechas, costos y notas ya cargados: PI, BL y contenedor también persisten", async ({ page }) => {
    const prev = await page.request.patch(`/api/admin/envios/${envioId}`, {
      data: {
        ...VACIO,
        numeroPI: "PI-ANTERIOR",
        fechaEmbarque: "2026-09-01",
        fechaArriboEstimado: "2026-10-15",
        costoPI: 18500.5,
        costoFlete: 3200,
        notas: "Envío con datos previos",
      },
    });
    expect(prev.ok()).toBeTruthy();

    const valores = { pi: `PI-E2E-${Date.now()}`, bl: "BL-E2E-999", contenedor: "TGHU7654321" };
    await page.goto(`/admin/envios/${envioId}`);
    await expect(page.getByLabel("N° PI")).toHaveValue("PI-ANTERIOR");
    await cargarYGuardar(page, valores);
    await verificarPersistencia(page, valores);

    // El resto de los datos no se pierde al guardar.
    await expect(page.getByLabel("Fecha embarque")).toHaveValue("2026-09-01");
    await expect(page.getByLabel("Costo PI (USD)")).toHaveValue("18500.5");
    await expect(page.getByLabel("Notas")).toHaveValue("Envío con datos previos");
  });
});
