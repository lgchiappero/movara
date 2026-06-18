import { test, expect, type Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Complete steps 1–5 of the configurador with default valid choices. */
async function completarPasos1a5(page: Page) {
  // Step 1 — Modelo: MOVARA 20ft
  await expect(page.getByText("MOVARA 20ft").first()).toBeVisible();
  await page.locator("button").filter({ hasText: "MOVARA 20ft" }).first().click();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 2 — Finalidad: Inversor
  await expect(page.getByText("Inversor").first()).toBeVisible();
  await page.getByRole("button", { name: /Inversor/ }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 3 — Ubicación: Buenos Aires
  await expect(page.locator("#cfg-provincia")).toBeVisible();
  await page.selectOption("#cfg-provincia", "Buenos Aires");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 4 — Configuración: 2 habitaciones (max for 20ft), cocina y baño ya activos
  await expect(page.getByText("Ambientes")).toBeVisible();
  await page.getByRole("button", { name: "2 hab." }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 5 — Mejoras: saltar (opcionales)
  await expect(page.getByText("Disponibles para todos los modelos")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Configurador — flujo completo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/configurador");
    await expect(page.getByText("Paso 1 de 7")).toBeVisible();
  });

  test("Test 1: flujo completo Particular — aparece botón de WhatsApp en resultado", async ({
    page,
  }) => {
    await completarPasos1a5(page);

    // Step 6 — Datos (Particular por defecto)
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
    await page.getByPlaceholder("Ej: Juan García").fill("Juan García");
    await page.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
    await page.getByPlaceholder("tu@email.com").fill("juan@example.com");

    // Button enables once all fields are valid
    await expect(page.getByRole("button", { name: "Ver mi configuración" })).toBeEnabled();
    await page.getByRole("button", { name: "Ver mi configuración" }).click();

    // Result screen
    await expect(page.getByRole("button", { name: /Enviar por WhatsApp/ })).toBeVisible();
  });

  test("Test 2: botón Siguiente deshabilitado si no hay selección", async ({ page }) => {
    // Step 1: no model selected → disabled
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // Select MOVARA 10ft → enabled
    await page.locator("button").filter({ hasText: "MOVARA 10ft" }).first().click();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    // Step 2: no finalidad → disabled
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 2 de 7")).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // Select Agro → enabled
    await page.getByRole("button", { name: /Agro/ }).click();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    // Step 3: no provincia → disabled
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 3 de 7")).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // Select provincia → enabled
    await page.selectOption("#cfg-provincia", "Córdoba");
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  test("Test 3: botón Atrás vuelve al paso anterior correctamente", async ({ page }) => {
    // Step 1 → step 2
    await page.locator("button").filter({ hasText: "MOVARA 20ft" }).first().click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 2 de 7")).toBeVisible();

    // Back to step 1
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByText("Paso 1 de 7")).toBeVisible();
    await expect(page.getByText("MOVARA 20ft").first()).toBeVisible();

    // Step 1 → step 2 → step 3 → back to step 2
    await page.locator("button").filter({ hasText: "MOVARA 10ft" }).first().click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: /Vivienda/ }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 3 de 7")).toBeVisible();
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByText("Paso 2 de 7")).toBeVisible();
    await expect(page.getByRole("button", { name: /Vivienda/ })).toBeVisible();
  });

  test("Test 4: flujo Empresa — razón social aparece en el mensaje de WhatsApp", async ({
    page,
  }) => {
    await completarPasos1a5(page);

    // Step 6 — Datos: cambiar a Empresa
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
    await page.getByRole("button", { name: "Empresa" }).click();

    const razonSocial = "Constructora MOVARA S.A.";
    await page.getByPlaceholder("Ej: Constructora Ejemplo S.A.").fill(razonSocial);
    await page.getByPlaceholder("Ej: María López").fill("María López");
    await page.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
    await page.getByPlaceholder("contacto@empresa.com").fill("empresa@example.com");

    await expect(page.getByRole("button", { name: "Ver mi configuración" })).toBeEnabled();
    await page.getByRole("button", { name: "Ver mi configuración" }).click();

    // Result: WhatsApp button visible
    await expect(page.getByRole("button", { name: /Enviar por WhatsApp/ })).toBeVisible();

    // Razón social aparece en el mensaje WA pre-generado
    const waTextarea = page.locator("textarea");
    await expect(waTextarea).toBeVisible();
    const msg = await waTextarea.inputValue();
    expect(msg).toContain(razonSocial);
    expect(msg).toContain("🏢 Contacto: María López");
  });
});
