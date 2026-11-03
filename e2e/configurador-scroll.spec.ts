import { test, expect, type Page } from "@playwright/test";

// Al cambiar de paso (Siguiente, Atrás, resultado) la vista vuelve al inicio
// del configurador: el indicador de pasos queda visible justo debajo del
// header fijo, aunque el paso anterior se haya scrolleado hasta el fondo.

const MARGEN_BAJO_HEADER = 16;

async function abrirConfigurador(page: Page) {
  // El resultado guarda el pedido: acá no interesa, no se escribe en la base.
  await page.route("**/api/pedido", (route) =>
    route.fulfill({ status: 201, json: { numeroConsulta: "C-E2E", tokenSeguimiento: "e2e" } })
  );
  await page.goto("/configurador");
  const cfg = page.locator('main[data-configurador="listo"]');
  await expect(cfg).toHaveCount(1);
  await expect(cfg.getByText("Paso 1 de 6", { exact: true })).toBeVisible();
}

async function alFondo(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

/** Posición del indicador de pasos (o del título del resultado) respecto del
 * borde inferior del header fijo. */
async function posicionInicio(page: Page) {
  return page.evaluate(() => {
    const inicio = Array.from(document.querySelectorAll("[data-cfg-inicio]")).find((el) => el.getClientRects().length > 0);
    const header = document.querySelector("[data-header-fijo] nav");
    const top = inicio!.getBoundingClientRect().top;
    const bottomHeader = header ? header.getBoundingClientRect().bottom : 0;
    return Math.round(top - bottomHeader);
  });
}

async function esperarInicioArriba(page: Page, paso: string) {
  await expect(page.getByText(paso, { exact: true })).toBeVisible();
  // Justo debajo del header: ni tapado por él ni más abajo del margen.
  await expect.poll(() => posicionInicio(page)).toBeGreaterThanOrEqual(MARGEN_BAJO_HEADER - 2);
  await expect.poll(() => posicionInicio(page)).toBeLessThanOrEqual(MARGEN_BAJO_HEADER + 2);
  await expect(page.locator("[data-cfg-inicio]").filter({ visible: true })).toBeInViewport();
}

async function siguiente(page: Page, pasoNuevo: string, boton = "Siguiente") {
  await alFondo(page);
  await page.getByRole("button", { name: boton }).click();
  await esperarInicioArriba(page, pasoNuevo);
}

async function atras(page: Page, pasoNuevo: string) {
  await alFondo(page);
  await page.getByRole("button", { name: /Atrás/ }).click();
  await esperarInicioArriba(page, pasoNuevo);
}

for (const [nombre, viewport] of [
  ["celular", { width: 390, height: 844 }],
  ["escritorio", { width: 1280, height: 800 }],
] as const) {
  test.describe(`Configurador — scroll al cambiar de paso (${nombre})`, () => {
    test.use({ viewport });

    test("Siguiente y Atrás desde el fondo de cada paso dejan el indicador de pasos arriba", async ({ page }) => {
      await abrirConfigurador(page);

      await page.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
      await siguiente(page, "Paso 2 de 6");

      await page.getByRole("button", { name: /Inversor/ }).click();
      await siguiente(page, "Paso 3 de 6");

      await page.locator("#cfg-localidad").fill("La Plata");
      await page.selectOption("#cfg-provincia", "Buenos Aires");
      await siguiente(page, "Paso 4 de 6");

      await siguiente(page, "Paso 5 de 6");

      // Atrás, de a un paso, también desde el fondo.
      await atras(page, "Paso 4 de 6");
      await atras(page, "Paso 3 de 6");
      await atras(page, "Paso 2 de 6");
      await atras(page, "Paso 1 de 6");
    });

    test("al mostrar el resultado y al volver de él, el título queda arriba", async ({ page }) => {
      await abrirConfigurador(page);
      await page.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
      await page.getByRole("button", { name: "Siguiente" }).click();
      await page.getByRole("button", { name: /Inversor/ }).click();
      await page.getByRole("button", { name: "Siguiente" }).click();
      await page.locator("#cfg-localidad").fill("La Plata");
      await page.selectOption("#cfg-provincia", "Buenos Aires");
      await page.getByRole("button", { name: "Siguiente" }).click();
      await expect(page.getByText("Paso 4 de 6", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Siguiente" }).click();
      await expect(page.getByText("Paso 5 de 6", { exact: true })).toBeVisible();
      await page.getByPlaceholder("Ej: Juan García").fill("Juan García");
      await page.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
      await page.getByPlaceholder("tu@email.com").fill("juan@example.com");

      await siguiente(page, "Paso 6 de 6 — Tu configuración", "Ver mi configuración");

      await alFondo(page);
      await page.getByRole("button", { name: "Modificar configuración" }).click();
      await esperarInicioArriba(page, "Paso 5 de 6");
    });
  });
}
