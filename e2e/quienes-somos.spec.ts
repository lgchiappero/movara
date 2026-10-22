import { test, expect } from "@playwright/test";

// /quienes-somos: el documento quienesSomos de Sanity está vacío, así que se
// ven los textos por defecto de src/data/quienes-somos.ts.

test.describe("Quiénes somos", () => {
  test("muestra portada, historia, presencia, misión, visión y valores, en ese orden", async ({ page }) => {
    await page.goto("/quienes-somos");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Estamos repensando la forma de habitar.");
    await expect(page.getByText(/MOVARA nace en Sunchales, Santa Fe/)).toBeVisible();

    const titulos = await page.locator("main h2").allTextContents();
    expect(titulos.map((t) => t.replace(/^[MV]/, "").trim())).toEqual([
      "Nuestra historia",
      "De Sunchales a todo el país",
      "Misión",
      "Visión",
      "Nuestros valores",
    ]);

    const presencia = page.getByRole("region", { name: "De Sunchales a todo el país" });
    await expect(presencia.getByRole("heading", { level: 3 })).toHaveText([
      "Dónde estamos",
      "Cómo llegamos a cada punto de la Argentina",
      "Hacia dónde vamos",
    ]);
    for (const valor of ["Transparencia", "Calidad verificable", "Acompañamiento", "Diseño"]) {
      await expect(page.getByRole("heading", { level: 3, name: valor })).toBeVisible();
    }
  });

  test("no muestra el claim de los 8 años ni la sección Equipo", async ({ page }) => {
    await page.goto("/quienes-somos");
    await expect(page.locator("main")).not.toContainText(/8 años/);
    await expect(page.getByRole("heading", { name: "El equipo" })).toHaveCount(0);
  });

  test("presencia: 3 columnas en desktop y apiladas en el celular", async ({ page }) => {
    const columnas = async () => {
      const bloques = page.getByRole("region", { name: "De Sunchales a todo el país" }).locator("h3");
      const tops = await bloques.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      return new Set(tops).size;
    };
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/quienes-somos");
    expect(await columnas()).toBe(1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await columnas()).toBe(3);
  });

  test("meta description nueva", async ({ page }) => {
    await page.goto("/quienes-somos");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "MOVARA nace en Sunchales para repensar la forma de habitar: casas modulares de diseño, llave en mano, con entrega en toda la Argentina."
    );
  });
});
