import { test, expect, type Page } from "@playwright/test";

// En el celular ninguna página puede tener scroll horizontal (el navegador
// la achicaría para que entre), y en el configurador Siguiente tiene que estar
// a la vista sin scrollear: va en la barra fija de abajo, con el total.

const PAGINAS = ["/", "/modelos", "/producto", "/nosotros", "/privacidad", "/terminos"];

async function sinScrollHorizontal(page: Page, donde: string) {
  // Las imágenes lazy y las animaciones de entrada pueden cambiar el ancho:
  // se recorre la página antes de medir.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  const medida = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const recorta = (el: Element) => {
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).overflowX !== "visible") return true;
      }
      return false;
    };
    const culpable = [...document.body.querySelectorAll("*")].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > vw + 1 && !recorta(el);
    });
    return {
      scrollWidth: document.documentElement.scrollWidth,
      vw,
      culpable: culpable ? `${culpable.tagName.toLowerCase()}.${(culpable.getAttribute("class") ?? "").split(/\s+/).slice(0, 5).join(".")}` : null,
    };
  });
  expect(medida.scrollWidth, `${donde}: scroll horizontal (${medida.scrollWidth}px > ${medida.vw}px), causa: ${medida.culpable}`).toBeLessThanOrEqual(medida.vw);
}

/** Siguiente en pantalla y sin nada encima, sin scrollear. */
async function siguienteALaVista(page: Page, paso: string, nombre = "Siguiente") {
  const boton = page.getByRole("button", { name: nombre });
  await expect(boton, `${paso}: Siguiente fuera de pantalla`).toBeInViewport({ ratio: 1 });
  const tapado = await boton.evaluate((b) => {
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(el && (el === b || b.contains(el)));
  });
  expect(tapado, `${paso}: Siguiente tapado por otro elemento`).toBe(false);
  const alto = (await boton.boundingBox())!.height;
  expect(alto, `${paso}: Siguiente de menos de 44px`).toBeGreaterThanOrEqual(44);
}

for (const ancho of [360, 390]) {
  test.describe(`Celular ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: ancho === 360 ? 740 : 844 } });

    test("las páginas principales y cada modelo no tienen scroll horizontal", async ({ page }) => {
      for (const ruta of PAGINAS) {
        await page.goto(ruta);
        await sinScrollHorizontal(page, ruta);
      }
      // Cada /modelos/[slug] publicado (salen de Sanity).
      await page.goto("/modelos");
      const slugs = [
        ...new Set(
          (await page.locator('a[href^="/modelos/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!))).filter((h) =>
            /^\/modelos\/[\w-]+$/.test(h)
          )
        ),
      ];
      expect(slugs.length).toBeGreaterThan(0);
      for (const ruta of slugs) {
        await page.goto(ruta);
        await sinScrollHorizontal(page, ruta);
      }
    });

    test("configurador: sin scroll horizontal y con Siguiente a la vista en cada paso", async ({ page }) => {
      await page.route("**/api/pedido", (r) => r.fulfill({ status: 201, json: { numeroConsulta: "C-E2E", tokenSeguimiento: "e2e" } }));
      await page.goto("/configurador");
      const cfg = page.locator('main[data-configurador="listo"]');
      await expect(cfg).toHaveCount(1);
      const siguiente = () => page.getByRole("button", { name: "Siguiente" }).click();

      await siguienteALaVista(page, "paso 1");
      await page.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
      await sinScrollHorizontal(page, "configurador paso 1");
      await siguiente();

      await expect(page.getByText("Paso 2 de 6", { exact: true })).toBeVisible();
      await siguienteALaVista(page, "paso 2");
      await page.getByRole("button", { name: /Inversor/ }).click();
      await sinScrollHorizontal(page, "configurador paso 2");
      await siguiente();

      await expect(page.getByText("Paso 3 de 6", { exact: true })).toBeVisible();
      await siguienteALaVista(page, "paso 3");
      await page.locator("#cfg-localidad").fill("La Plata");
      await page.selectOption("#cfg-provincia", "Buenos Aires");
      await sinScrollHorizontal(page, "configurador paso 3");
      await siguiente();

      await expect(page.getByText("Paso 4 de 6", { exact: true })).toBeVisible();
      await siguienteALaVista(page, "paso 4");
      await page.getByText("¿Querés balcón?").locator("..").getByRole("button", { name: "Frontal", exact: true }).click();
      await page.getByRole("button", { name: /Inodoro inteligente con bidet/ }).click();
      await sinScrollHorizontal(page, "configurador paso 4");
      // También al fondo del paso: Siguiente sigue a la vista.
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await siguienteALaVista(page, "paso 4 (al fondo)");
      await siguiente();

      await expect(page.getByText("Paso 5 de 6", { exact: true })).toBeVisible();
      await siguienteALaVista(page, "paso 5", "Ver mi configuración");
      await page.getByPlaceholder("Ej: Juan García").fill("Juan García");
      await page.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
      await page.getByPlaceholder("tu@email.com").fill("juan@example.com");
      await sinScrollHorizontal(page, "configurador paso 5");
      await page.getByRole("button", { name: "Ver mi configuración" }).click();

      await expect(page.getByText("Paso 6 de 6 — Tu configuración")).toBeVisible();
      await sinScrollHorizontal(page, "configurador resultado");
    });
  });
}
