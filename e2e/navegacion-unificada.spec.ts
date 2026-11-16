import { test, expect, type Page } from "@playwright/test";

// Toda ruta pública comparte el layout de app/(sitio): header (logo → home y
// Volver fuera de la home) y footer. Si una página nueva o movida queda fuera
// del layout, este test falla. Ver docs/base-del-sitio.md.

const PANTALLAS = [
  ["390", { width: 390, height: 844 }],
  ["1440", { width: 1440, height: 900 }],
] as const;

/** Un token con formato válido que no existe: el recibo muestra "Link no válido". */
const RECIBO_INEXISTENTE = `/recibo/${"0".repeat(64)}`;

const RUTAS_FIJAS = [
  "/",
  "/modelos",
  "/modelos/flex",
  "/configurador",
  "/producto",
  "/nosotros",
  "/faq",
  "/agendar",
  RECIBO_INEXISTENTE,
  "/mi-pedido",
  "/privacidad",
  "/terminos",
  "/esta-pagina-no-existe",
];

/** El primer modelo del catálogo (los slugs vienen de Sanity). */
async function rutaDeUnModelo(page: Page): Promise<string> {
  await page.goto("/modelos");
  const href = await page
    .locator('main a[href^="/modelos/"]:not([href="/modelos/flex"])')
    .first()
    .getAttribute("href");
  expect(href, "el catálogo no tiene ningún modelo").toBeTruthy();
  return href!.split(/[?#]/)[0];
}

const header = (page: Page) => page.locator("header[data-header-fijo]");
const logo = (page: Page) => header(page).getByRole("link", { name: "MOVARA, ir al inicio" });
const volver = (page: Page) => header(page).getByRole("button", { name: "Volver" });

async function verificarMarco(page: Page, ruta: string) {
  await expect(header(page), `${ruta}: falta el header`).toHaveCount(1);
  await expect(header(page), `${ruta}: header oculto`).toBeVisible();
  await expect(logo(page), `${ruta}: falta el logo`).toBeVisible();
  await expect(logo(page), `${ruta}: el logo no lleva a la home`).toHaveAttribute("href", "/");

  if (ruta === "/") {
    await expect(volver(page), "la home no lleva Volver").toHaveCount(0);
  } else {
    await expect(volver(page), `${ruta}: falta Volver`).toBeVisible();
    await expect(volver(page), `${ruta}: Volver fuera de pantalla`).toBeInViewport({ ratio: 1 });
    const caja = (await volver(page).boundingBox())!;
    expect(caja.height, `${ruta}: Volver de menos de 44px de alto`).toBeGreaterThanOrEqual(44);
    expect(caja.width, `${ruta}: Volver de menos de 44px de ancho`).toBeGreaterThanOrEqual(44);
  }

  const footer = page.locator("footer");
  await expect(footer, `${ruta}: falta el footer (o hay más de uno)`).toHaveCount(1);
  await expect(page.locator("main"), `${ruta}: tiene que haber un solo <main>`).toHaveCount(1);
  await footer.scrollIntoViewIfNeeded();
  await expect(footer, `${ruta}: footer oculto`).toBeVisible();

  const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(ancho[0], `${ruta}: scroll horizontal`).toBeLessThanOrEqual(ancho[1]);
}

for (const [nombre, vp] of PANTALLAS) {
  test.describe(`Marco común en ${nombre}px`, () => {
    test.use({ viewport: vp });

    for (const ruta of RUTAS_FIJAS) {
      test(`${ruta}: header, logo → home, Volver y footer`, async ({ page }) => {
        await page.goto(ruta);
        await verificarMarco(page, ruta);
      });
    }

    test("un modelo: header, logo → home, Volver y footer", async ({ page }) => {
      const ruta = await rutaDeUnModelo(page);
      await page.goto(ruta);
      await verificarMarco(page, ruta);
    });
  });
}

test.describe("Volver", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("entrada directa a un modelo: va al catálogo, sin salir del sitio", async ({ page }) => {
    const ruta = await rutaDeUnModelo(page);
    // Pestaña nueva, como si se abriera desde WhatsApp.
    const nueva = await page.context().newPage();
    await nueva.goto(ruta);
    await volver(nueva).click();
    await expect(nueva).toHaveURL(/\/modelos$/);
    await nueva.close();
  });

  test("entrada directa a agendar: va a la home", async ({ page }) => {
    await page.goto("/agendar");
    await volver(page).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("navegando dentro del sitio vuelve a la página anterior", async ({ page }) => {
    await page.goto("/faq");
    await page.locator("footer").getByRole("link", { name: "Privacidad" }).click();
    await expect(page).toHaveURL(/\/privacidad$/);
    await volver(page).click();
    await expect(page).toHaveURL(/\/faq$/);
  });

  test("configurador con datos cargados: pide confirmación con un modal propio", async ({ page }) => {
    let usoConfirm = false;
    page.on("dialog", (d) => {
      usoConfirm = true;
      void d.dismiss();
    });
    await page.goto("/configurador");
    // Sin datos, Volver sale directo.
    await volver(page).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/configurador");
    await page.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await volver(page).click();
    const dialogo = page.getByRole("alertdialog", { name: "¿Salir sin enviar?" });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole("button", { name: "Seguir acá" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page).toHaveURL(/\/configurador/);

    await volver(page).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(usoConfirm, "no se usa window.confirm()").toBe(false);
  });

  test("404: links a la home y a modelos", async ({ page }) => {
    const res = await page.goto("/no-existe-esto");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No encontramos esta página");
    await page.getByRole("link", { name: "Ver modelos" }).click();
    await expect(page).toHaveURL(/\/modelos$/);
  });
});
