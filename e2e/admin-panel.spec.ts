import { test, expect } from "@playwright/test";

test.use({
  httpCredentials: {
    username: process.env.ADMIN_USER ?? "luciano",
    password: process.env.ADMIN_PASSWORD ?? "Lunes12!",
  },
});

test.describe("Panel admin unificado", () => {
  test("Test 1: dashboard responde 200 y muestra las secciones principales", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Pedidos por estado")).toBeVisible();
    await expect(page.getByText("Google Analytics 4")).toBeVisible();
  });

  test("Test 2: sidebar tiene los links de navegación esperados", async ({ page }) => {
    await page.goto("/admin");
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: /Dashboard/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Leads/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Pedidos/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Contenido/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Modelos/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Configuración/ })).toBeVisible();
  });

  test("Test 3: navegar a Leads desde el sidebar funciona", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("aside").getByRole("link", { name: /Leads/ }).click();
    await expect(page).toHaveURL(/\/admin\/leads/);
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  });

  test("Test 4: /admin/configuraciones sigue funcionando dentro del layout nuevo", async ({
    page,
  }) => {
    const response = await page.goto("/admin/configuraciones");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Configuraciones de pedido" })
    ).toBeVisible();
  });

  test("Test 5: contenido y modelos cargan el iframe de Studio", async ({ page }) => {
    await page.goto("/admin/contenido");
    await expect(page.locator("iframe[title='Sanity Studio']")).toBeVisible();

    await page.goto("/admin/modelos");
    const iframe = page.locator("iframe[title='Modelos — Sanity Studio']");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("src", "/studio/structure/modelos");
  });
});
