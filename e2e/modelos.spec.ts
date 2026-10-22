import { test, expect, type Page } from "@playwright/test";

// Home y /modelos muestran la misma card por modelo (MOVARA Flex y MOVARA
// Duplex, desde Sanity). Cada card linkea a la página de su modelo.
const MODELOS = [
  { nombre: /MOVARA Flex/, url: /\/modelos\/flex$/ },
  { nombre: /MOVARA Duplex/, url: /\/modelos\/movara-duplex[a-z0-9-]*$/ },
];

async function verificarCards(page: Page, contenedor: string) {
  const cards = page.locator(contenedor).locator("[data-modelo-card]");
  await expect(cards).toHaveCount(2);
  for (const { nombre } of MODELOS) {
    const link = page.locator(contenedor).getByRole("link", { name: nombre });
    await expect(link).toBeVisible();
    // Imagen completa (object-contain), nunca recortada.
    const img = link.getByRole("img");
    if (await img.count()) await expect(img).toHaveClass(/object-contain/);
  }
  // Las dos cards a la misma altura.
  const [a, b] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
  expect(Math.abs(a!.height - b!.height)).toBeLessThan(2);
}

test.describe("Cards de modelos", () => {
  test("home: sección 'Nuestros modelos' con las 2 cards y link al catálogo", async ({ page }) => {
    await page.goto("/");
    const seccion = page.locator("section#modelos");
    await seccion.scrollIntoViewIfNeeded();
    await expect(seccion.getByRole("heading", { name: "Nuestros modelos" })).toBeVisible();
    await verificarCards(page, "section#modelos");
    await seccion.getByRole("link", { name: "Ver catálogo completo" }).click();
    await expect(page).toHaveURL(/\/modelos$/);
  });

  test("/modelos: las mismas 2 cards", async ({ page }) => {
    await page.goto("/modelos");
    await expect(page.getByRole("heading", { level: 1, name: "Nuestros modelos" })).toBeVisible();
    await verificarCards(page, "main");
  });

  for (const { nombre, url } of MODELOS) {
    test(`/modelos → ${nombre.source} abre la página del modelo`, async ({ page }) => {
      await page.goto("/modelos");
      await page.locator("main").getByRole("link", { name: nombre }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("home → card del Flex abre /modelos/flex", async ({ page }) => {
    await page.goto("/");
    await page.locator("section#modelos").getByRole("link", { name: /MOVARA Flex/ }).click();
    await expect(page).toHaveURL(/\/modelos\/flex$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("Página de modelo — qué incluye el precio", () => {
  test("no da por incluido el traslado y aclara qué va aparte", async ({ page }) => {
    await page.goto("/modelos/familiar-65");
    const aside = page.locator("aside");
    await expect(aside.getByText("Incluido en el precio")).toBeVisible();
    await expect(aside.getByText("Unidad terminada, llave en mano")).toBeVisible();
    await expect(aside.getByText("No incluye", { exact: true })).toBeVisible();
    await expect(aside.getByText("Traslado hasta tu terreno (se cotiza según tu ubicación)")).toBeVisible();
    await expect(aside.getByText(/Transporte hasta tu terreno|Instalación y nivelación|Planos aprobados/)).toHaveCount(0);
  });
});
