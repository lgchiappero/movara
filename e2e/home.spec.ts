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
