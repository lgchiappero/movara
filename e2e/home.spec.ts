import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Test 1: home carga correctamente con título MOVARA en el Navbar", async ({ page }) => {
    // Navbar logo text is always present and hardcoded
    await expect(page.getByText("MOVARA").first()).toBeVisible();

    // Page should not show HTTP error headings
    await expect(page.getByRole("heading", { name: "404" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "500" })).not.toBeVisible();
  });

  test("Test 2: botón 'Empezar ahora' navega a /configurador", async ({ page }) => {
    // El CTA de la sección de proceso (ComoFunciona) es el que lleva al
    // configurador desde la home.
    const ctaLink = page.getByRole("link", { name: /Empezar ahora/i });
    await ctaLink.scrollIntoViewIfNeeded();
    await expect(ctaLink).toBeVisible();

    await ctaLink.click();
    await expect(page).toHaveURL(/\/configurador/);
    await expect(page.getByText("Paso 1 de 7")).toBeVisible();
  });

  test("Test 3: sección de modelos es visible", async ({ page }) => {
    // El banner regional ("8 modelos regionales") ya no existe; la home
    // muestra los modelos en ModelosHome. "Nuestros modelos" es su título por
    // defecto — si se edita en Sanity, actualizar este texto.
    await expect(page.getByRole("heading", { name: "Nuestros modelos" })).toBeVisible();
  });
});

test.describe("Home con 'reducir movimiento'", () => {
  test("hidrata sin errores y el indicador de scroll queda sin la línea animada", async ({ page }) => {
    const errores: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
    page.on("pageerror", (e) => errores.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await expect(page.getByText("Scroll", { exact: true })).toBeVisible();
    // Tras hidratar, React vuelve a renderizar con la preferencia real y
    // quita la línea (en dev la hidratación puede tardar varios segundos).
    await expect(page.locator('span[class*="via-[#D4B06A]"]')).toHaveCount(0, { timeout: 30_000 });
    expect(errores.filter((e) => /hydrat/i.test(e))).toEqual([]);
  });
});

