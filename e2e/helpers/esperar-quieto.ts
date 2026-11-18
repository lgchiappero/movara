import { expect, type Locator, type Page } from "@playwright/test";

/** Espera a que la página quede quieta antes de interactuar: fuentes
 * cargadas (el cambio de fuente corre el contenido) y sin animaciones CSS o
 * Web Animations en curso (las infinitas, como un pulso decorativo, no
 * cuentan). Evita los clics que caen donde el elemento ya no está, el fallo
 * intermitente que se vio en Firefox. */
export async function esperarQuieto(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => {
      const iteraciones = a.effect?.getComputedTiming().iterations;
      return a.playState !== "running" || iteraciones === Infinity;
    })
  );
}

/** Además de lo anterior, espera a que el elemento no se mueva entre dos
 * cuadros seguidos (animaciones por JS que getAnimations no ve). */
export async function esperarElementoQuieto(locator: Locator): Promise<void> {
  await esperarQuieto(locator.page());
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => {
      const a = await locator.boundingBox();
      await locator.page().evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const b = await locator.boundingBox();
      return !!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    })
    .toBe(true);
}

/** Clic recién cuando la página y el elemento están quietos. */
export async function clicQuieto(locator: Locator): Promise<void> {
  await esperarElementoQuieto(locator);
  await locator.click();
}
