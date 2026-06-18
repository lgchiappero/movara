import { test, expect } from "@playwright/test";

test.describe("Catálogo de modelos", () => {
  test("Test 1: /modelos carga con el listado de modelos", async ({ page }) => {
    await page.goto("/modelos");

    await expect(page.getByRole("heading", { name: /Nuestros modelos/i })).toBeVisible();

    // At least one "Ver detalles" link rendered by ModelCard
    const links = page.getByRole("link", { name: /Ver detalles/i });
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Test 2: click en 'Ver detalles' navega a la página del modelo", async ({ page }) => {
    await page.goto("/modelos");

    // Click the first "Ver detalles" link
    const firstLink = page.getByRole("link", { name: /Ver detalles/i }).first();
    await firstLink.click();

    // URL should match /modelos/<slug>
    await expect(page).toHaveURL(/\/modelos\/[a-z0-9-]+/);

    // Model detail page renders an h1 with the model name
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
