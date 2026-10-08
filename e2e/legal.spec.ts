import { test, expect } from "@playwright/test";

test.describe("Páginas legales", () => {
  for (const [ruta, titulo] of [
    ["/privacidad", "Política de Privacidad"],
    ["/terminos", "Términos y Condiciones"],
  ] as const) {
    test(`${ruta} responde 200 con índice navegable`, async ({ page }) => {
      const res = await page.goto(ruta);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
      const indice = page.getByRole("navigation", { name: "Índice" });
      const primero = indice.getByRole("link").first();
      const ancla = (await primero.getAttribute("href"))!;
      await primero.click();
      await expect(page).toHaveURL(new RegExp(`${ancla}$`));
      await expect(page.locator(ancla)).toBeInViewport();
    });
  }

  test("el footer no tiene links rotos (rutas internas y anclas)", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("footer a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    const internos = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
    expect(internos).toEqual(expect.arrayContaining(["/privacidad", "/terminos"]));
    for (const href of internos) {
      const [ruta, ancla] = href.split("#");
      const res = await request.get(ruta || "/");
      expect(res.status(), href).toBeLessThan(400);
      if (ancla) {
        await page.goto(href);
        await expect(page.locator(`#${ancla}`), href).toHaveCount(1);
      }
    }
  });

  test("los formularios con datos personales enlazan la Política de Privacidad", async ({ page }) => {
    await page.goto("/#contacto");
    const aviso = page.locator("#contacto").getByText(/Al enviar aceptás la/);
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});
