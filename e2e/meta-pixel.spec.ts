import { test, expect, type Page } from "@playwright/test";

// El píxel de Meta se carga con next/script strategy="afterInteractive"
// (src/app/layout.tsx): no bloquea el primer pintado, pero corre apenas la
// página es interactiva, así que el PageView se mide aunque la visita dure
// un segundo. Para no mandar eventos reales a Meta desde los tests, el
// script de fbevents.js se reemplaza por uno vacío: los eventos quedan en
// la cola de fbq, que es lo que fbevents.js procesa al cargar.

const PIXEL_ID = "996322016615557";

async function colaDelPixel(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => {
    const fbq = (window as unknown as { fbq?: { queue?: unknown[][] } }).fbq;
    return (fbq?.queue ?? []).map((args) => Array.from(args as ArrayLike<unknown>));
  });
}

const pageViews = (cola: unknown[][]) => cola.filter((a) => a[0] === "track" && a[1] === "PageView").length;

test.beforeEach(async ({ page }) => {
  await page.route("https://connect.facebook.net/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
  );
});

test("al cargar la página se inicializa el píxel y se registra un PageView", async ({ page }) => {
  const pedidoScript = page.waitForRequest("https://connect.facebook.net/en_US/fbevents.js");
  await page.goto("/");
  await pedidoScript;
  await expect.poll(async () => pageViews(await colaDelPixel(page))).toBe(1);
  const cola = await colaDelPixel(page);
  expect(cola[0]).toEqual(["init", PIXEL_ID]);
});

test("el script del píxel está en afterInteractive: no es un <script> del HTML inicial", async ({ request }) => {
  // beforeInteractive o un <script> en el <head> lo pondrían en el HTML del
  // servidor; afterInteractive lo inyecta Next en el cliente.
  const html = await (await request.get("/")).text();
  expect(html).not.toMatch(/<script[^>]*id="meta-pixel"/);
  expect(html).toContain(`facebook.com/tr?id=${PIXEL_ID}&amp;ev=PageView&amp;noscript=1`);
});

test("navegar a otra página dentro del sitio registra otro PageView", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => pageViews(await colaDelPixel(page))).toBe(1);
  await page.getByRole("link", { name: /Ver modelos/ }).first().click();
  await expect(page).toHaveURL(/\/modelos$/);
  await expect.poll(async () => pageViews(await colaDelPixel(page))).toBe(2);
});
