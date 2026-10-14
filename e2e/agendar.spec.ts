import { test, expect } from "@playwright/test";

test.describe("/agendar — ubicación del showroom", () => {
  test("debajo de la dirección está 'Cómo llegar (Google Maps)' con el link a la ubicación exacta", async ({ page }) => {
    await page.goto("/agendar");
    await expect(page.getByText(/en Sunchales, Santa Fe\./)).toBeVisible();
    const link = page.getByRole("link", { name: "Cómo llegar (Google Maps)" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/3q8E5RUDq5bGNZLS6");
    await expect(link).toHaveAttribute("target", "_blank");
  });
});
