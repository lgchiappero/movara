import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Abre el configurador y espera a que esté hidratado. Mientras carga, el HTML
 * trae una copia oculta del paso 1 (el streaming de Suspense) y los clics antes
 * de hidratar se pierden: por eso se espera la marca y se busca adentro. */
async function abrirConfigurador(page: Page, url = "/configurador") {
  await page.goto(url);
  const cfg = page.locator('main[data-configurador="listo"]');
  await expect(cfg).toHaveCount(1);
  await expect(cfg.getByText("Paso 1 de 6", { exact: true })).toBeVisible();
  return cfg;
}

/** Completa los pasos 1–4 con opciones válidas y deja el configurador en Datos. */
async function completarPasos1a4(page: Page) {
  // Step 1 — Modelo: MOVARA Flex 38
  await expect(page.getByText("MOVARA Flex 38").first()).toBeVisible();
  await page.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 2 — Finalidad: Inversor
  await expect(page.getByText("Inversor").first()).toBeVisible();
  await page.getByRole("button", { name: /Inversor/ }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 3 — Ubicación: La Plata, Buenos Aires
  await expect(page.locator("#cfg-provincia")).toBeVisible();
  await page.locator("#cfg-localidad").fill("La Plata");
  await page.selectOption("#cfg-provincia", "Buenos Aires");
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 4 — Configuración: 2 habitaciones (max for 20ft), cocina y baño ya activos
  await expect(page.getByText("Ambientes")).toBeVisible();
  await page.getByRole("button", { name: "2 hab." }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Step 5 — Datos (ya no hay paso de mejoras)
  await expect(page.getByText("Paso 5 de 6", { exact: true })).toBeVisible();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Configurador — flujo completo", () => {
  test.beforeEach(async ({ page }) => {
    await abrirConfigurador(page);
  });

  test("Test 1: flujo completo Particular — aparece botón de WhatsApp en resultado", async ({
    page,
  }) => {
    await completarPasos1a4(page);

    // Paso 5 — Datos (Particular por defecto)
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

    // Select MOVARA Flex 18 → enabled
    await page.locator("button").filter({ hasText: "MOVARA Flex 18" }).first().click();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    // Step 2: no finalidad → disabled
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 2 de 6", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // Select Agro → enabled
    await page.getByRole("button", { name: /Agro/ }).click();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    // Step 3: no provincia → disabled
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 3 de 6", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // Solo la provincia no alcanza: la localidad es obligatoria
    await page.selectOption("#cfg-provincia", "Córdoba");
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

    // Con localidad y provincia → enabled
    await page.locator("#cfg-localidad").fill("Río Cuarto");
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  test("Test 3: botón Atrás vuelve al paso anterior correctamente", async ({ page }) => {
    // Step 1 → step 2
    await page.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 2 de 6", { exact: true })).toBeVisible();

    // Back to step 1
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByText("Paso 1 de 6", { exact: true })).toBeVisible();
    await expect(page.getByText("MOVARA Flex 38").first()).toBeVisible();

    // Step 1 → step 2 → step 3 → back to step 2
    await page.locator("button").filter({ hasText: "MOVARA Flex 18" }).first().click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: /Vivienda/ }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 3 de 6", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByText("Paso 2 de 6", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Vivienda/ })).toBeVisible();
  });

  test("Test 4: flujo Empresa — razón social aparece en el mensaje de WhatsApp", async ({
    page,
  }) => {
    await completarPasos1a4(page);

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

test.describe("Configurador — preselección vía ?modelo=", () => {
  test("con un modelo válido queda preseleccionado y se puede avanzar", async ({ page }) => {
    await abrirConfigurador(page, "/configurador?modelo=20ft");
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  test("con un modelo inválido no preselecciona nada", async ({ page }) => {
    await abrirConfigurador(page, "/configurador?modelo=no-existe");
    await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
});

test.describe("Configurador — balcón a consultar y notas (6 pasos)", () => {
  test("elige balcón con sobretecho completo, deja notas, se guarda y el admin lo ve como A consultar", async ({ page }) => {
    const cfg = await abrirConfigurador(page);
    await cfg.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await cfg.getByRole("button", { name: /Inversor/ }).click();
    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await cfg.locator("#cfg-localidad").fill("La Plata");
    await cfg.locator("#cfg-provincia").selectOption("Buenos Aires");
    await expect(cfg.getByText(/Zona climática/)).toHaveCount(0);
    await cfg.getByRole("button", { name: "Siguiente" }).click();

    // Paso 4: sección Balcón
    await expect(cfg.getByText("Paso 4 de 6", { exact: true })).toBeVisible();
    await expect(cfg.getByText("Techo", { exact: true })).toHaveCount(0);
    await cfg.getByRole("button", { name: "Lateral", exact: true }).click();
    await cfg.getByRole("button", { name: /Sobretecho completo: balcón y toda la unidad/ }).click();
    await expect(cfg.getByText("+ Balcón lateral: A consultar").first()).toBeVisible();
    await expect(cfg.getByText(/Galería con sobretecho/)).toHaveCount(0);

    const notas = cfg.getByLabel(/¿Algo más que necesitemos saber\?/);
    await notas.fill("Acceso con rampa\nTerreno orientado al norte");
    await expect(cfg.getByText("43/1000")).toBeVisible();
    await cfg.getByRole("button", { name: "Siguiente" }).click();

    // Paso 5: datos
    await expect(cfg.getByText("Paso 5 de 6", { exact: true })).toBeVisible();
    await cfg.getByPlaceholder("Ej: Juan García").fill("Playwright Balcon");
    await cfg.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
    await cfg.getByPlaceholder("tu@email.com").fill("balcon@example.com");
    await cfg.getByRole("button", { name: "Ver mi configuración" }).click();

    // Paso 6: resultado
    await expect(page.getByText("Paso 6 de 6 — Tu configuración")).toBeVisible();
    await expect(page.getByText("+ Sobretecho completo: balcón y toda la unidad").first()).toBeVisible();
    await expect(page.getByText(/El traslado hasta tu terreno se cotiza según tu ubicación/)).toBeVisible();
    await expect(page.getByText(/transporte e instalación/)).toHaveCount(0);
    await expect(page.getByText("Llanura Pampeana")).toHaveCount(0);
    await expect(page.getByRole("textbox").first()).not.toHaveValue(/Zona climática/);
    const registro = page.getByText(/Tu consulta fue registrada con el código/);
    await expect(registro).toBeVisible({ timeout: 20_000 });
    const numeroConsulta = (await registro.locator("span").textContent())!.trim();

    // Admin: la ficha muestra el balcón como A consultar y las notas
    await loginAsAdmin(page);
    await page.goto("/admin/configuraciones");
    const href = await page.locator("tr", { hasText: numeroConsulta }).getByRole("link", { name: "Ver detalle" }).getAttribute("href");
    await page.goto(href!);
    await expect(page.getByText("Balcón lateral", { exact: true })).toBeVisible();
    await expect(page.getByText("Sobretecho completo: balcón y toda la unidad", { exact: true })).toBeVisible();
    await expect(page.getByText("A consultar", { exact: true })).toHaveCount(2);
    await expect(page.locator("textarea").filter({ hasText: "Acceso con rampa" })).toHaveValue(
      "Acceso con rampa\nTerreno orientado al norte"
    );
  });

  test("en Flex 18 no se ofrece el balcón lateral", async ({ page }) => {
    const cfg = await abrirConfigurador(page, "/configurador?modelo=10ft");
    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await cfg.getByRole("button", { name: /Inversor/ }).click();
    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await cfg.locator("#cfg-localidad").fill("Rosario");
    await cfg.locator("#cfg-provincia").selectOption("Santa Fe");
    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await expect(cfg.getByRole("button", { name: "Frontal", exact: true })).toBeVisible();
    await expect(cfg.getByRole("button", { name: "Lateral", exact: true })).toHaveCount(0);
  });
});

test.describe("Configurador — precios de los extras", () => {
  test("los 4 extras con precio suman base + USD 5.020 y el pedido guarda el desglose para el PDF", async ({ page }) => {
    const cfg = await abrirConfigurador(page);
    await llegarAlPaso4(cfg);
    await cfg.getByRole("button", { name: "Frontal", exact: true }).click();
    await expect(cfg.getByRole("button", { name: /Sobretecho solo en el balcón/ })).toContainText("+ USD 3.100");
    await cfg.getByRole("button", { name: /Gris con líneas/ }).click();
    await cfg.getByRole("button", { name: /^8917/ }).click();
    const inodoro = cfg.getByRole("button", { name: /Inodoro inteligente con bidet/ });
    await expect(inodoro).toContainText("+ USD 580");
    await inodoro.click();
    // 38 m² × 680 = 25.840 + 5.020
    await expect(cfg.getByText("USD 30.860").first()).toBeVisible();
    await expect(cfg.getByText(/Precios en USD, IVA incluido/).first()).toBeVisible();

    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await cfg.getByPlaceholder("Ej: Juan García").fill("Playwright Extras");
    await cfg.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
    await cfg.getByPlaceholder("tu@email.com").fill("extras@example.com");
    await cfg.getByRole("button", { name: "Ver mi configuración" }).click();

    await expect(page.getByText("Paso 6 de 6 — Tu configuración")).toBeVisible();
    await expect(page.getByText("+ Inodoro inteligente con bidet", { exact: true })).toBeVisible();
    const msg = await page.locator("textarea").first().inputValue();
    expect(msg).toContain("- Balcón frontal de 2 m con sobretecho, deck y barandas: USD 3.100");
    expect(msg).toContain("💰 Precio estimado: USD 30.860");
    const registro = page.getByText(/Tu consulta fue registrada con el código/);
    await expect(registro).toBeVisible({ timeout: 20_000 });
    const numeroConsulta = (await registro.locator("span").textContent())!.trim();

    await loginAsAdmin(page);
    await page.goto("/admin/configuraciones");
    const href = await page.locator("tr", { hasText: numeroConsulta }).getByRole("link", { name: "Ver detalle" }).getAttribute("href");
    const pdf = await page.request.get(`/api${href}/pdf-cliente`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    // En el detalle es el extra "inodoro-inteligente", tildado.
    await page.goto(href!);
    await expect(page.getByRole("checkbox", { name: "Inodoro inteligente con bidet" })).toBeChecked();
  });

  test("sin baño el inodoro inteligente no se ofrece ni suma, aunque se haya elegido antes", async ({ page }) => {
    const cfg = await abrirConfigurador(page);
    await llegarAlPaso4(cfg);
    await cfg.getByRole("button", { name: /Inodoro inteligente con bidet/ }).click();
    await expect(cfg.getByText("USD 26.420").first()).toBeVisible();
    await cfg.getByText("¿Incluye baño?").locator("..").getByRole("button", { name: "No", exact: true }).click();
    await expect(cfg.getByRole("button", { name: /Inodoro inteligente con bidet/ })).toHaveCount(0);
    await expect(cfg.getByText("USD 25.840").first()).toBeVisible();
    await cfg.getByText("¿Incluye baño?").locator("..").getByRole("button", { name: "Sí", exact: true }).click();
    await expect(cfg.getByRole("button", { name: /Inodoro inteligente con bidet/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("la ficha técnica muestra los mismos precios y la leyenda de IVA", async ({ page }) => {
    await page.goto("/producto");
    const extras = page.getByRole("heading", { name: "Extras y personalización" }).locator("..");
    await expect(extras.getByText("Balcón de 2 m con sobretecho, deck y barandas").locator("..")).toContainText("+USD 3.100");
    await expect(extras.getByText("Inodoro inteligente con bidet").locator("..")).toContainText("+USD 580");
    await expect(extras.getByText("Techo a dos aguas").locator("..")).toContainText("A consultar");
    await expect(extras.getByText("Precios en USD, IVA incluido.")).toBeVisible();
  });
});

test.describe("Configurador — amoblamiento del baño", () => {
  test("sin costo, con placeholder mientras no hay fotos; llega al resumen, al WhatsApp, al pedido y al admin", async ({ page }) => {
    const cfg = await abrirConfigurador(page);
    await llegarAlPaso4(cfg);
    await expect(cfg.getByText("Amoblamiento del baño — sin costo")).toBeVisible();
    const opciones = cfg.getByRole("button", { name: /Amoblamiento — opción/ });
    await expect(opciones).toHaveCount(4);
    // Las fotos todavía no están en public/configurador/bano: cada card muestra el placeholder.
    // (las imágenes son lazy: intentan cargar al entrar en pantalla).
    for (let i = 0; i < 4; i++) {
      await opciones.nth(i).scrollIntoViewIfNeeded();
      await expect(opciones.nth(i).getByText("Foto próximamente")).toBeVisible();
    }
    await cfg.getByRole("button", { name: /Amoblamiento — opción 2/ }).click();
    await expect(cfg.getByText("USD 25.840").first()).toBeVisible();

    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await cfg.getByPlaceholder("Ej: Juan García").fill("Playwright Amoblamiento");
    await cfg.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
    await cfg.getByPlaceholder("tu@email.com").fill("amoblamiento@example.com");
    await cfg.getByRole("button", { name: "Ver mi configuración" }).click();

    await expect(page.getByText("Paso 6 de 6 — Tu configuración")).toBeVisible();
    await expect(page.getByText("Amoblamiento del baño", { exact: true }).locator("xpath=following-sibling::span[1]")).toHaveText("Amoblamiento — opción 2");
    expect(await page.locator("textarea").first().inputValue()).toContain("- Amoblamiento baño: Amoblamiento — opción 2");
    const registro = page.getByText(/Tu consulta fue registrada con el código/);
    await expect(registro).toBeVisible({ timeout: 20_000 });
    const numeroConsulta = (await registro.locator("span").textContent())!.trim();

    await loginAsAdmin(page);
    await page.goto("/admin/configuraciones");
    const href = await page.locator("tr", { hasText: numeroConsulta }).getByRole("link", { name: "Ver detalle" }).getAttribute("href");
    await page.goto(href!);
    await expect(page.getByText("Amoblamiento del baño: Amoblamiento — opción 2")).toBeVisible();
  });

  test("sin baño no se muestra", async ({ page }) => {
    const cfg = await abrirConfigurador(page);
    await llegarAlPaso4(cfg);
    await cfg.getByText("¿Incluye baño?").locator("..").getByRole("button", { name: "No", exact: true }).click();
    await expect(cfg.getByText("Amoblamiento del baño — sin costo")).toHaveCount(0);
  });
});

test.describe("Configurador — agua caliente sin opción a gas (6 pasos)", () => {
  test("el calefón eléctrico es un dato fijo y llega así al mensaje y al pedido", async ({ page }) => {
    const cfg = await abrirConfigurador(page);
    await llegarAlPaso4(cfg);

    // Paso 4: sin selector de agua caliente, una línea fija debajo del baño
    await expect(cfg.getByText("Agua caliente", { exact: true })).toHaveCount(0);
    await expect(cfg.getByText(/termotanque/i)).toHaveCount(0);
    await expect(cfg.getByText("Calefón eléctrico incluido.")).toBeVisible();
    await expect(cfg.getByText(/baño con calefón eléctrico/)).toBeVisible();
    // Cocina "Preparación gas" queda como está (se decide aparte)
    await expect(cfg.getByRole("button", { name: "Preparación gas" })).toBeVisible();

    await cfg.getByRole("button", { name: "Siguiente" }).click();
    await expect(cfg.getByText("Paso 5 de 6", { exact: true })).toBeVisible();
    await cfg.getByPlaceholder("Ej: Juan García").fill("Playwright Calefon");
    await cfg.getByPlaceholder("Ej: +54 9 11 1234-5678").fill("+5491112345678");
    await cfg.getByPlaceholder("tu@email.com").fill("calefon@example.com");
    await cfg.getByRole("button", { name: "Ver mi configuración" }).click();

    // Paso 6: resumen y mensaje de WhatsApp
    await expect(page.getByText("Paso 6 de 6 — Tu configuración")).toBeVisible();
    await expect(page.getByText("Calefón eléctrico", { exact: true })).toBeVisible();
    const msg = await page.locator("textarea").first().inputValue();
    expect(msg).toContain("baño con calefón eléctrico");
    expect(msg).not.toMatch(/termotanque|gas/i);
    const registro = page.getByText(/Tu consulta fue registrada con el código/);
    await expect(registro).toBeVisible({ timeout: 20_000 });
    const numeroConsulta = (await registro.locator("span").textContent())!.trim();

    // Admin: el pedido quedó con calefón eléctrico
    await loginAsAdmin(page);
    await page.goto("/admin/configuraciones");
    const href = await page.locator("tr", { hasText: numeroConsulta }).getByRole("link", { name: "Ver detalle" }).getAttribute("href");
    await page.goto(href!);
    await expect(page.getByLabel("Tipo de agua caliente")).toHaveValue("calefon-electrico");
    await expect(page.getByText("Baño: Con baño — calefón eléctrico")).toBeVisible();
  });

  test("sin baño no se muestra el calefón", async ({ page }) => {
    const cfg = await abrirConfigurador(page);
    await llegarAlPaso4(cfg);
    await cfg.getByText("¿Incluye baño?").locator("..").getByRole("button", { name: "No", exact: true }).click();
    await expect(cfg.getByText("Calefón eléctrico incluido.")).toHaveCount(0);
    await expect(cfg.getByText(/sin baño/)).toBeVisible();
  });
});

/** Completa los pasos 1–3 con opciones válidas y deja el configurador en el paso 4. */
async function llegarAlPaso4(cfg: ReturnType<Page["locator"]>) {
  await cfg.locator("button").filter({ hasText: "MOVARA Flex 38" }).first().click();
  await cfg.getByRole("button", { name: "Siguiente" }).click();
  await cfg.getByRole("button", { name: /Inversor/ }).click();
  await cfg.getByRole("button", { name: "Siguiente" }).click();
  await cfg.locator("#cfg-localidad").fill("La Plata");
  await cfg.locator("#cfg-provincia").selectOption("Buenos Aires");
  await cfg.getByRole("button", { name: "Siguiente" }).click();
  await expect(cfg.getByText("Paso 4 de 6", { exact: true })).toBeVisible();
}
