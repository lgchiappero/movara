import { test, expect, type Page } from "@playwright/test";

// El píxel de Meta mide solo visitas reales en producción (movara.com.ar,
// VERCEL_ENV=production, sin navegador automatizado) y en rutas públicas: ver
// src/lib/meta-pixel.ts. Los e2e corren en localhost con Playwright, así que
// acá el píxel no se tiene que cargar nunca, ni en páginas públicas ni en las
// excluidas, ni siquiera al disparar eventos (configurador, WhatsApp).
// El caso "sí carga en producción" está cubierto por los tests unitarios.

const pedidosAlPixel: string[] = [];

test.beforeEach(async ({ page }) => {
  pedidosAlPixel.length = 0;
  // Si algo se escapara, que no llegue a Meta: se corta y se registra.
  await page.route(/connect\.facebook\.net|facebook\.com\/tr/, (route) => {
    pedidosAlPixel.push(route.request().url());
    return route.abort();
  });
});

async function sinPixel(page: Page) {
  // Margen para que corran los efectos del cliente (donde se cargaría).
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => typeof (window as unknown as { fbq?: unknown }).fbq)).toBe("undefined");
  expect(pedidosAlPixel).toEqual([]);
}

for (const ruta of ["/", "/modelos", "/configurador", "/agendar", "/faq"]) {
  test(`página pública ${ruta}: fuera de producción no carga el píxel`, async ({ page }) => {
    await page.goto(ruta);
    await sinPixel(page);
  });
}

for (const ruta of ["/admin", "/mi-pedido", "/recibo/token-inexistente", "/agendar/cancelar/id-inexistente"]) {
  test(`ruta excluida ${ruta}: no carga el píxel`, async ({ page }) => {
    await page.goto(ruta);
    await sinPixel(page);
  });
}

test("el HTML no trae el píxel ni el <noscript> de Meta", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("connect.facebook.net");
  expect(html).not.toContain("facebook.com/tr");
});

test("navegar y tocar WhatsApp no carga el píxel", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Ver modelos/ }).first().click();
  await expect(page).toHaveURL(/\/modelos$/);
  // Los links de WhatsApp abren una pestaña nueva: se cierra sin cargarla.
  context.on("page", (p) => void p.close());
  const wa = page.locator('a[href*="wa.me"]').first();
  await wa.click();
  await sinPixel(page);
});
