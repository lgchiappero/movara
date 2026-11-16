import { test, expect, type Locator, type Page } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };
const CELULAR = { width: 390, height: 844 };
const PANTALLAS = [
  ["desktop", DESKTOP],
  ["celular", CELULAR],
] as const;

/** Header de 64px + 16px de aire (src/lib/scroll.ts). */
const TOPE_SECCION = 80;

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const topSeccion = (page: Page, id: string) =>
  page.evaluate((i) => Math.round(document.getElementById(i)!.getBoundingClientRect().top), id);

async function bajar(page: Page, y = 2500) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(400);
}

function logo(page: Page) {
  return page.locator("header").getByRole("link", { name: "MOVARA, ir al inicio" });
}

async function linkDelMenu(page: Page, nombre: string, celular: boolean) {
  if (celular) await page.getByRole("button", { name: "Menú" }).click();
  return page.locator("header").getByRole("link", { name: nombre, exact: true });
}

test.describe("Header — logo", () => {
  for (const [nombre, vp] of PANTALLAS) {
    test(`${nombre}: el cubo tiene la altura del texto y está centrado en la barra`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("/");
      const m = await logo(page).evaluate((a) => {
        const r = (e: Element) => e.getBoundingClientRect();
        const cubo = r(a.querySelector("[data-logo-icono]")!);
        const textos = [...a.querySelectorAll("div > span")].map(r);
        const barra = r(a.closest("nav")!);
        return {
          cubo: { top: cubo.top, bottom: cubo.bottom, left: cubo.left },
          texto: { top: Math.min(...textos.map((t) => t.top)), bottom: Math.max(...textos.map((t) => t.bottom)) },
          barra: { top: barra.top, bottom: barra.bottom },
          padding: parseFloat(getComputedStyle(a.closest("nav")!).paddingLeft),
          anchoPagina: document.documentElement.scrollWidth,
          anchoVentana: window.innerWidth,
        };
      });
      const centro = (b: { top: number; bottom: number }) => (b.top + b.bottom) / 2;
      expect(Math.abs(centro(m.cubo) - centro(m.texto))).toBeLessThanOrEqual(3);
      expect(Math.abs(centro(m.cubo) - centro(m.barra))).toBeLessThanOrEqual(3);
      expect(m.cubo.bottom - m.cubo.top).toBeGreaterThanOrEqual((m.texto.bottom - m.texto.top) * 0.85);
      // El cubo arranca en el margen de la página, sin el hueco transparente de la imagen.
      expect(Math.round(m.cubo.left)).toBe(m.padding);
      expect(m.anchoPagina).toBeLessThanOrEqual(m.anchoVentana);
    });
  }

  test("en un celular angosto (320px) el logo y el menú entran sin scroll horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(desborde).toBeLessThanOrEqual(0);
    await expect(page.getByRole("button", { name: "Menú" })).toBeInViewport();
  });

  for (const [nombre, vp] of PANTALLAS) {
    test(`${nombre}: en la home, el logo sube al principio`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("/");
      await bajar(page);
      await logo(page).click();
      await expect.poll(() => scrollY(page)).toBe(0);
      await expect(page).toHaveURL(/\/$/);
    });

    test(`${nombre}: desde otra página, el logo lleva a la home arriba de todo`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("/nosotros");
      await bajar(page, 800);
      await logo(page).click();
      await expect(page).toHaveURL(/\/$/);
      await expect.poll(() => scrollY(page)).toBe(0);
    });
  }

  test("en la home con #seccion, el logo sube y saca el # de la URL", async ({ page }) => {
    await page.goto("/#proceso");
    await expect.poll(() => scrollY(page)).toBeGreaterThan(400);
    await logo(page).click();
    await expect.poll(() => scrollY(page)).toBe(0);
    expect(new URL(page.url()).hash).toBe("");
  });
});

test.describe("Botón volver arriba", () => {
  const CASOS = [
    ["desktop, home", DESKTOP, "/"],
    ["celular, home", CELULAR, "/"],
    ["desktop, configurador", DESKTOP, "/configurador?modelo=40ft"],
  ] as const;

  /** El botón entra con una animación de opacidad y escala (framer-motion):
   * se mide cuando terminó, si no la caja sale achicada. */
  async function cajaQuieta(boton: Locator) {
    await expect(boton).toHaveCSS("opacity", "1");
    await expect(boton).toHaveCSS("transform", "none");
    return (await boton.boundingBox())!;
  }

  for (const [nombre, vp, ruta] of CASOS) {
    test(`${nombre}: aparece al bajar, no queda tapado y sube`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(ruta);
      // El configurador, al hidratar y aplicar ?modelo=, vuelve la vista a su
      // inicio: si se baja antes, ese salto sube la página y el botón se va.
      if (ruta.startsWith("/configurador")) await expect(page.locator('[data-configurador="listo"]')).toHaveCount(1);
      const boton = page.getByRole("button", { name: "Volver al inicio" });
      await expect(boton).toHaveCount(0);
      await bajar(page, ruta === "/" ? 2500 : 1500);
      await expect(boton).toBeVisible();

      const caja = await cajaQuieta(boton);
      expect(caja.y + caja.height).toBeLessThanOrEqual(vp.height);
      // Mismo criterio que el componente (altoBarraInferior): solo cuentan las
      // barras fijas abajo; la del configurador es fija solo en el celular.
      const barras = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("[data-barra-inferior]")]
          .filter((b) => b.offsetHeight > 0 && getComputedStyle(b).position === "fixed")
          .map((b) => window.innerHeight - b.offsetHeight)
      );
      for (const topeBarra of barras) expect(caja.y + caja.height).toBeLessThanOrEqual(topeBarra - 8);
      // Lo que se ve en el centro del botón es el botón, no otra cosa encima.
      const arriba = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label") ?? null,
        [caja.x + caja.width / 2, caja.y + caja.height / 2]
      );
      expect(arriba).toBe("Volver al inicio");

      await boton.click();
      await expect.poll(() => scrollY(page)).toBe(0);
    });
  }

  test("celular, configurador: no aparece, para no tapar la barra fija de Atrás/Siguiente", async ({ page }) => {
    await page.setViewportSize(CELULAR);
    await page.goto("/configurador?modelo=40ft");
    await expect(page.locator('[data-configurador="listo"]')).toHaveCount(1);
    await bajar(page, 1500);
    // Ya bajó lo suficiente para que en otra página apareciera.
    await expect.poll(() => scrollY(page)).toBeGreaterThan(400);
    await expect(page.getByRole("button", { name: "Volver al inicio" })).toBeHidden();
    await expect(page.locator("[data-cfg-navegacion]")).toBeInViewport();
  });
});

test.describe("Links del menú a secciones de la home", () => {
  for (const [nombre, vp] of PANTALLAS) {
    const celular = nombre === "celular";
    for (const [label, id] of [
      ["Proceso", "proceso"],
      ["Contacto", "contacto"],
    ] as const) {
      test(`${nombre}: "${label}" desde la home deja el título de la sección a la vista`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto("/");
        await (await linkDelMenu(page, label, celular)).click();
        await expect(page).toHaveURL(new RegExp(`/#${id}$`));
        await expect.poll(() => topSeccion(page, id), { timeout: 15_000 }).toBe(TOPE_SECCION);
        await expect(page.locator(`#${id} h2`).first()).toBeInViewport();
      });

      test(`${nombre}: "${label}" desde otra página lleva a la sección correcta`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto("/modelos");
        await (await linkDelMenu(page, label, celular)).click();
        await expect(page).toHaveURL(new RegExp(`/#${id}$`));
        await expect.poll(() => topSeccion(page, id), { timeout: 15_000 }).toBe(TOPE_SECCION);
      });
    }
  }

  test("entrando directo a /#contacto, el título no queda bajo el header", async ({ page }) => {
    await page.goto("/#contacto");
    await expect.poll(() => topSeccion(page, "contacto"), { timeout: 15_000 }).toBe(TOPE_SECCION);
  });

  test("el link del footer a 'Cómo funciona' también compensa el header", async ({ page }) => {
    await page.goto("/nosotros");
    await page.locator("footer").getByRole("link", { name: "Cómo funciona" }).click();
    await expect(page).toHaveURL(/\/#proceso$/);
    await expect.poll(() => topSeccion(page, "proceso"), { timeout: 15_000 }).toBe(TOPE_SECCION);
  });
});

test.describe("prefers-reduced-motion", () => {
  test("sin scroll suave: el logo, el botón y los links saltan directo", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");

    await bajar(page);
    await logo(page).click();
    expect(await scrollY(page)).toBe(0);

    await bajar(page);
    await page.getByRole("button", { name: "Volver al inicio" }).click();
    expect(await scrollY(page)).toBe(0);

    await page.locator("header").getByRole("link", { name: "Contacto", exact: true }).click();
    expect(await topSeccion(page, "contacto")).toBe(TOPE_SECCION);
  });
});

test("sin prefers-reduced-motion, el scroll es suave", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
  await bajar(page, 6000);
  await logo(page).click();
  // Justo después del clic todavía está en camino: no saltó directo.
  expect(await scrollY(page)).toBeGreaterThan(0);
  await expect.poll(() => scrollY(page)).toBe(0);
});
