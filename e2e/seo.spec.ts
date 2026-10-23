import { test, expect } from "@playwright/test";

test.describe("SEO — robots.txt y sitemap.xml", () => {
  test("robots.txt bloquea las rutas privadas y apunta al sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const texto = await res.text();
    for (const ruta of ["/admin", "/studio", "/api", "/recibo", "/mi-pedido", "/agendar/cancelar"]) {
      expect(texto).toContain(`Disallow: ${ruta}`);
    }
    expect(texto).toContain("Sitemap: https://movara.com.ar/sitemap.xml");
  });

  test("sitemap.xml tiene las páginas públicas y ninguna privada", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    for (const ruta of ["/", "/modelos", "/configurador", "/agendar", "/faq", "/nosotros", "/producto", "/privacidad", "/terminos"]) {
      expect(locs).toContain(ruta);
    }
    expect(locs.some((r) => /^\/(admin|studio|api|recibo|mi-pedido|agendar\/cancelar)/.test(r))).toBe(false);
  });

  test("la página de cancelación de una cita no se indexa", async ({ page }) => {
    await page.goto("/agendar/cancelar/no-existe");
    // notFound() igual devuelve la metadata del segmento o la del 404 con noindex.
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });
});
