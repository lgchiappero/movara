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

  test("Test 2: botón 'Encontrá tu modelo' navega a /configurador", async ({ page }) => {
    // The primary CTA in Hero links to /configurador
    const ctaLink = page.getByRole("link", { name: /Encontrá tu modelo/i });
    await expect(ctaLink).toBeVisible();

    await ctaLink.click();
    await expect(page).toHaveURL(/\/configurador/);
    await expect(page.getByText("Paso 1 de 7")).toBeVisible();
  });

  test("Test 3: banner regional de modelos es visible", async ({ page }) => {
    // RegionalBanner is always rendered on the home page.
    // "8 modelos regionales" badge is hardcoded in the component.
    await expect(page.getByText("8 modelos regionales")).toBeVisible();

    // Regional model nombres are hardcoded from REGIONAL_MODELS data
    await expect(page.getByText("Pampa").first()).toBeVisible();
    await expect(page.getByText("Tehuelche").first()).toBeVisible();
  });
});
