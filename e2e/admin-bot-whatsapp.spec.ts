import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsVendedor } from "./helpers/login";
import { clicQuieto, esperarQuieto } from "./helpers/esperar-quieto";

// Panel del bot de WhatsApp (etapa 1: sin WhatsApp ni IA). Cada test usa
// teléfonos propios y borra lo que crea; los que tocan la configuración
// (una sola fila compartida) la dejan como estaba, con el bot APAGADO.

const API = "/api/admin/bot-whatsapp";

/** Teléfono único por test y navegador: 3493 + 6 dígitos. */
function telefonoUnico(): { escrito: string; normalizado: string } {
  const n = String(Math.floor(100000 + Math.random() * 899999));
  return { escrito: `3493 ${n}`, normalizado: `5493493${n}` };
}

async function abrirPanel(page: Page, ruta = "/admin/bot-whatsapp") {
  // Después de guardar, el panel hace router.refresh(): si se navega mientras
  // esa actualización sigue en curso, Firefox cancela la navegación nueva
  // (NS_BINDING_ABORTED). Se espera a que la red quede quieta.
  await page.waitForLoadState("networkidle");
  await page.goto(ruta);
  await expect(page.getByRole("heading", { level: 1, name: "Bot de WhatsApp" })).toBeVisible();
  await esperarQuieto(page);
}

async function borrarLeadPorTelefono(page: Page, normalizado: string) {
  const res = await page.request.get(`${API}/leads?q=${normalizado}`);
  const { leads } = (await res.json()) as { leads: { id: string; telefono: string }[] };
  for (const l of leads.filter((x) => x.telefono === normalizado)) await page.request.delete(`${API}/leads/${l.id}`);
}

test.describe("Bot de WhatsApp — administrador", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("entra desde el menú; el bot arranca pausado; el interruptor lo prende y lo vuelve a pausar", async ({ page }) => {
    await page.goto("/admin");
    // El dashboard también tiene una tarjeta de acceso rápido: se entra por el menú.
    await clicQuieto(page.getByRole("navigation").getByRole("link", { name: "Bot WhatsApp" }));
    await expect(page).toHaveURL(/\/admin\/bot-whatsapp$/);
    await esperarQuieto(page);

    const interruptor = page.getByRole("switch");
    await expect(interruptor).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Bot pausado", { exact: true })).toBeVisible();

    await clicQuieto(interruptor);
    await expect(page.getByText("Bot activo", { exact: true })).toBeVisible();
    await expect(interruptor).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText(/Bot activo: va a responder/)).toBeVisible();

    await clicQuieto(interruptor);
    await expect(page.getByText("Bot pausado", { exact: true })).toBeVisible();
    await expect(interruptor).toHaveAttribute("aria-checked", "false");
    const { config } = await (await page.request.get(`${API}/config`)).json();
    expect(config.activo).toBe(false);
  });

  test("configuración: cambia el tope y el gasto lo refleja; vuelve a dejarlo en USD 5", async ({ page }) => {
    await abrirPanel(page, "/admin/bot-whatsapp?vista=configuracion");
    const tope = page.getByLabel("Tope de gasto mensual (USD)");
    await tope.fill("7");
    await clicQuieto(page.getByRole("button", { name: "Guardar configuración" }));
    await expect(page.getByText("Configuración guardada")).toBeVisible();
    await expect(page.getByText("de USD 7.00")).toBeVisible();

    await tope.fill("5");
    await clicQuieto(page.getByRole("button", { name: "Guardar configuración" }));
    await expect(page.getByText("de USD 5.00")).toBeVisible();
  });

  test("lead manual: alta, datos, Tomar control / Devolver al bot y borrado con confirmación", async ({ page }) => {
    const tel = telefonoUnico();
    try {
      await abrirPanel(page);
      await clicQuieto(page.getByRole("button", { name: "+ Agregar lead manual" }));
      await page.getByLabel("Teléfono *").fill(tel.escrito);
      await page.getByLabel("Nombre", { exact: true }).fill("E2E Ana");
      await page.getByLabel("Zona", { exact: true }).fill("Rafaela");
      await clicQuieto(page.getByRole("button", { name: "Guardar lead" }));

      await expect(page).toHaveURL(/\/admin\/bot-whatsapp\/[a-z0-9]+$/);
      await expect(page.getByRole("heading", { level: 1, name: "E2E Ana" })).toBeVisible();
      await esperarQuieto(page);
      await expect(page.getByRole("link", { name: "Abrir en WhatsApp" })).toHaveAttribute("href", new RegExp(`^https://wa\\.me/${tel.normalizado}\\?text=`));

      await page.getByLabel("Estado").selectOption("CALIFICADO");
      await page.getByLabel("Notas internas").fill("Quiere visitar el showroom");
      await clicQuieto(page.getByRole("button", { name: "Guardar datos" }));
      await expect(page.getByText("Datos guardados")).toBeVisible();

      await clicQuieto(page.getByRole("button", { name: "Tomar control" }));
      await expect(page.getByText("Lo atiende el equipo: el bot no le responde.")).toBeVisible();
      await clicQuieto(page.getByRole("button", { name: "Devolver al bot" }));
      await expect(page.getByText("Lo atiende el bot.")).toBeVisible();

      // Se ve en la tabla, con el filtro y la búsqueda.
      await abrirPanel(page, `/admin/bot-whatsapp?estado=CALIFICADO&q=${tel.normalizado.slice(-6)}`);
      const fila = page.getByRole("row", { name: /E2E Ana/ });
      await expect(fila).toContainText("Calificado");
      await clicQuieto(fila.getByRole("link", { name: "E2E Ana" }));

      await esperarQuieto(page);
      await clicQuieto(page.getByRole("button", { name: "Borrar lead" }));
      await clicQuieto(page.getByRole("alertdialog").getByRole("button", { name: "Borrar" }));
      await expect(page).toHaveURL(/\/admin\/bot-whatsapp$/);
      const { leads } = await (await page.request.get(`${API}/leads?q=${tel.normalizado}`)).json();
      expect(leads).toHaveLength(0);
    } finally {
      await borrarLeadPorTelefono(page, tel.normalizado);
    }
  });

  test("contactos excluidos: agregar y quitar con confirmación", async ({ page }) => {
    const tel = telefonoUnico();
    await abrirPanel(page, "/admin/bot-whatsapp?vista=excluidos");
    await page.getByLabel("Teléfono a excluir").fill(tel.escrito);
    await page.getByLabel("Etiqueta").selectOption("PROVEEDOR");
    await clicQuieto(page.getByRole("button", { name: "Agregar", exact: true }));
    const quitar = page.getByRole("button", { name: new RegExp(`Quitar .*${tel.normalizado.slice(-4)}$`) });
    await expect(quitar).toBeVisible();

    await clicQuieto(quitar);
    await clicQuieto(page.getByRole("alertdialog").getByRole("button", { name: "Quitar" }));
    await expect(page.getByText("Contacto quitado de la lista")).toBeVisible();
    await expect(quitar).toHaveCount(0);
  });

  for (const [pantalla, viewport] of [
    ["escritorio", { width: 1280, height: 800 }],
    ["celular", { width: 390, height: 844 }],
  ] as const) {
    test(`detalle (${pantalla}): el botón flotante "?" no tapa ningún campo de Datos`, async ({ page }) => {
      const tel = telefonoUnico();
      try {
        const res = await page.request.post(`${API}/leads`, { data: { telefono: tel.escrito, nombre: "E2E Ayuda" } });
        const { id } = await res.json();
        await page.setViewportSize(viewport);
        await page.goto(`/admin/bot-whatsapp/${id}`);
        await expect(page.getByRole("heading", { level: 1, name: "E2E Ayuda" })).toBeVisible();
        await esperarQuieto(page);
        const ayuda = page.getByRole("button", { name: "Abrir guía rápida" });
        const campos = page.getByRole("form", { name: "Datos del lead" }).locator("input, select, textarea, button");
        const n = await campos.count();
        expect(n).toBeGreaterThan(10);
        for (let i = 0; i < n; i++) {
          // Cada campo, llevado al borde inferior de la pantalla (donde está el botón).
          await campos.nth(i).evaluate((el) => el.scrollIntoView({ block: "end" }));
          const a = (await ayuda.boundingBox())!;
          const c = (await campos.nth(i).boundingBox())!;
          const seTocan = a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height;
          expect(seTocan, `campo ${i} (${await campos.nth(i).getAttribute("aria-label") ?? await campos.nth(i).evaluate((el) => el.closest("label")?.textContent?.trim() ?? el.textContent)}) tapado por el botón "?"`).toBe(false);
        }
      } finally {
        await borrarLeadPorTelefono(page, tel.normalizado);
      }
    });
  }

  test("celular: tarjetas en vez de tabla y sin scroll horizontal", async ({ page }) => {
    const tel = telefonoUnico();
    try {
      await page.request.post(`${API}/leads`, { data: { telefono: tel.escrito, nombre: "E2E Celular" } });
      await page.setViewportSize({ width: 390, height: 844 });
      await abrirPanel(page, `/admin/bot-whatsapp?q=${tel.normalizado.slice(-6)}`);
      await expect(page.getByRole("list", { name: "Leads de WhatsApp" }).getByText("E2E Celular")).toBeVisible();
      await expect(page.getByRole("table")).toBeHidden();
      const [scroll, ancho] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scroll).toBeLessThanOrEqual(ancho);
      expect((await page.getByRole("switch").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    } finally {
      await borrarLeadPorTelefono(page, tel.normalizado);
    }
  });
});

test.describe("Bot de WhatsApp — vendedor", () => {
  test("ve y trabaja leads, pero no puede prender el bot, configurar ni borrar (y el servidor lo rechaza)", async ({ page }) => {
    const tel = telefonoUnico();
    const excluido = telefonoUnico();
    try {
      await loginAsVendedor(page);
      await abrirPanel(page);

      // Interfaz: interruptor deshabilitado, sin pestaña de Configuración (ni por URL).
      await expect(page.getByRole("switch")).toBeDisabled();
      await expect(page.getByText("Solo un administrador puede prenderlo o pausarlo.")).toBeVisible();
      const secciones = page.getByRole("navigation", { name: "Secciones del bot" });
      await expect(secciones.getByRole("link")).toHaveText(["Leads", "Contactos excluidos"]);
      await abrirPanel(page, "/admin/bot-whatsapp?vista=configuracion");
      await expect(page.getByRole("form", { name: "Configuración del bot" })).toHaveCount(0);

      // Puede: agregar un lead, editarlo y tomar control.
      await clicQuieto(page.getByRole("button", { name: "+ Agregar lead manual" }));
      await page.getByLabel("Teléfono *").fill(tel.escrito);
      await page.getByLabel("Nombre", { exact: true }).fill("E2E Vendedor Lead");
      await clicQuieto(page.getByRole("button", { name: "Guardar lead" }));
      await expect(page.getByRole("heading", { level: 1, name: "E2E Vendedor Lead" })).toBeVisible();
      await esperarQuieto(page);
      await expect(page.getByRole("button", { name: "Borrar lead" })).toHaveCount(0);
      await clicQuieto(page.getByRole("button", { name: "Tomar control" }));
      await expect(page.getByText("Lo atiende el equipo: el bot no le responde.")).toBeVisible();
      const idLead = page.url().split("/").pop()!;

      // Puede agregar un excluido, pero no ve "Quitar".
      await abrirPanel(page, "/admin/bot-whatsapp?vista=excluidos");
      await page.getByLabel("Teléfono a excluir").fill(excluido.escrito);
      await clicQuieto(page.getByRole("button", { name: "Agregar", exact: true }));
      await expect(page.getByText("Contacto excluido", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /Quitar/ })).toHaveCount(0);

      // El servidor rechaza lo que no le corresponde, aunque llame a la API directo.
      expect((await page.request.patch(`${API}/config`, { data: { activo: true } })).status()).toBe(403);
      expect((await page.request.patch(`${API}/config`, { data: { topeGastoMensualUsd: 100 } })).status()).toBe(403);
      expect((await page.request.delete(`${API}/leads/${idLead}`)).status()).toBe(403);
      const { excluidos } = await (await page.request.get(`${API}/excluidos`)).json();
      const idExcluido = excluidos.find((x: { telefono: string }) => x.telefono === excluido.normalizado).id;
      expect((await page.request.delete(`${API}/excluidos/${idExcluido}`)).status()).toBe(403);
      const { config } = await (await page.request.get(`${API}/config`)).json();
      expect(config.activo).toBe(false);
      expect(config.topeGastoMensualUsd).toBe(5);
    } finally {
      // Limpieza como administrador.
      await loginAsAdmin(page);
      await borrarLeadPorTelefono(page, tel.normalizado);
      const { excluidos } = await (await page.request.get(`${API}/excluidos`)).json();
      for (const x of excluidos.filter((e: { telefono: string }) => e.telefono === excluido.normalizado)) {
        await page.request.delete(`${API}/excluidos/${x.id}`);
      }
    }
  });
});
