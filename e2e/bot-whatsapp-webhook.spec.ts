import { createHmac } from "crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";
import { esperarQuieto } from "./helpers/esperar-quieto";

// Bot de WhatsApp, etapa 2: webhook de Meta con IA y WhatsApp SIMULADOS
// (playwright.config.ts: BOT_IA_SIMULADA, WHATSAPP_SIMULADO, E2E_BOT_RAPIDO y
// un App Secret de prueba). Nunca llama a Claude ni a Meta. El test que
// prende el bot deja la configuración como estaba (APAGADO) y manda los
// avisos a una dirección @example.com (bandeja local, sin emails reales).

const SECRETO = "e2e-app-secret-local";
const WEBHOOK = "/api/whatsapp/webhook";
const API = "/api/admin/bot-whatsapp";

function telefonoUnico(): string {
  return `5493493${Math.floor(100000 + Math.random() * 899999)}`;
}

function cuerpo(from: string, id: string, texto: string): string {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { messaging_product: "whatsapp", messages: [{ from, id, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: texto } }] } }] }],
  });
}

async function enviarWebhook(request: APIRequestContext, body: string, secreto = SECRETO) {
  const firma = `sha256=${createHmac("sha256", secreto).update(body).digest("hex")}`;
  return request.post(WEBHOOK, { data: body, headers: { "Content-Type": "application/json", "X-Hub-Signature-256": firma } });
}

type Mensaje = { autor: string; contenido: string };
type Lead = { id: string; telefono: string; estado: string; controlHumano: boolean; nombre: string | null; zona: string | null; mensajes: Mensaje[] };

async function leadPorTelefono(page: Page, telefono: string): Promise<Lead | null> {
  const { leads } = (await (await page.request.get(`${API}/leads?q=${telefono}`)).json()) as { leads: { id: string; telefono: string }[] };
  const l = leads.find((x) => x.telefono === telefono);
  if (!l) return null;
  return ((await (await page.request.get(`${API}/leads/${l.id}`)).json()) as { lead: Lead }).lead;
}

async function borrarLead(page: Page, telefono: string) {
  const l = await leadPorTelefono(page, telefono);
  if (l) await page.request.delete(`${API}/leads/${l.id}`);
}

test.describe("Bot de WhatsApp — webhook (simulado)", () => {
  test("verificación de Meta y firma: el challenge con el token correcto; 403 y 401 si no", async ({ request }) => {
    const ok = await request.get(`${WEBHOOK}?hub.mode=subscribe&hub.verify_token=e2e-verify-token-local&hub.challenge=987654`);
    expect(ok.status()).toBe(200);
    expect(await ok.text()).toBe("987654");
    expect((await request.get(`${WEBHOOK}?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1`)).status()).toBe(403);

    const tel = telefonoUnico();
    const r = await enviarWebhook(request, cuerpo(tel, `wamid.e2e.${tel}.malo`, "info"), "secreto-equivocado");
    expect(r.status()).toBe(401);
    expect((await request.post(WEBHOOK, { data: cuerpo(tel, "x", "info") })).status()).toBe(401);
  });

  test("bot pausado: guarda el mensaje (una sola vez aunque Meta reintente) y no responde", async ({ page }) => {
    await loginAsAdmin(page);
    const { config } = await (await page.request.get(`${API}/config`)).json();
    expect(config.activo).toBe(false);
    const tel = telefonoUnico();
    try {
      const body = cuerpo(tel, `wamid.e2e.${tel}.1`, "Hola, quería info de las casas");
      expect((await enviarWebhook(page.request, body)).status()).toBe(200);
      expect((await enviarWebhook(page.request, body)).status()).toBe(200);

      await expect.poll(async () => (await leadPorTelefono(page, tel))?.mensajes.length ?? 0).toBe(1);
      // Con las esperas al 5 %, una respuesta tardaría ~1 s: se espera de más.
      await page.waitForTimeout(3_000);
      const lead = (await leadPorTelefono(page, tel))!;
      expect(lead.mensajes.map((m) => m.autor)).toEqual(["CLIENTE"]);

      await page.goto(`/admin/bot-whatsapp/${lead.id}`);
      await esperarQuieto(page);
      await expect(page.getByRole("list", { name: "Conversación" })).toContainText("Hola, quería info de las casas");
    } finally {
      await borrarLead(page, tel);
    }
  });

  test("bot activo: conversación completa hasta CALIFICADO, después control humano", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsAdmin(page);
    const { config } = await (await page.request.get(`${API}/config`)).json();
    const tel = telefonoUnico();
    try {
      const patch = await page.request.patch(`${API}/config`, { data: { activo: true, modoHorario: false, emailAviso: "bot-e2e@example.com" } });
      expect(patch.status()).toBe(200);

      // Pasos nuevos: nombre + uso, localidad + terreno, personas + plazo, cierre.
      const turnos = ["Hola, quería info de las casas", "Ana Pérez, Para vivir", "Rafaela, Sí, tengo terreno", "3, Lo antes posible"];
      for (const [i, texto] of turnos.entries()) {
        await enviarWebhook(page.request, cuerpo(tel, `wamid.e2e.${tel}.${i}`, texto));
        await expect
          .poll(async () => (await leadPorTelefono(page, tel))?.mensajes.filter((m) => m.autor === "BOT").length ?? 0, { timeout: 15_000 })
          .toBe(i + 1);
      }
      const lead = (await leadPorTelefono(page, tel))!;
      expect(lead).toMatchObject({ estado: "CALIFICADO", controlHumano: true, nombre: "Ana Pérez", uso: "Para vivir", zona: "Rafaela", terreno: "Sí", personas: "3", plazo: "Lo antes posible" });
      // Uno de los cierres aprobados, con el nombre de pila y sin prometer "hoy".
      expect(lead.mensajes.at(-1)!.contenido).toMatch(/^(Gracias|Perfecto|Genial), Ana[,.]/);
      expect(lead.mensajes.at(-1)!.contenido).not.toMatch(/\bhoy\b/i);
      // El primer mensaje del bot llevó la lista de usos.
      expect(lead.mensajes[1].contenido).toContain("[Opciones: Para vivir / Para alquilar o invertir");

      // Con control humano el bot ya no responde.
      await enviarWebhook(page.request, cuerpo(tel, `wamid.e2e.${tel}.extra`, "¿Y cuándo me escribe?"));
      await page.waitForTimeout(3_000);
      const despues = (await leadPorTelefono(page, tel))!;
      expect(despues.mensajes).toHaveLength(turnos.length * 2 + 1);
      expect(despues.mensajes.at(-1)!.autor).toBe("CLIENTE");

      await page.goto(`/admin/bot-whatsapp/${lead.id}`);
      await esperarQuieto(page);
      await expect(page.getByRole("list", { name: "Conversación" })).toContainText("¿En qué localidad la instalarías y ya tenés terreno?");
      await expect(page.getByRole("button", { name: "Devolver al bot" })).toBeVisible();
    } finally {
      await page.request.patch(`${API}/config`, { data: { activo: false, modoHorario: config.modoHorario, emailAviso: config.emailAviso } });
      await borrarLead(page, tel);
    }
  });
});
