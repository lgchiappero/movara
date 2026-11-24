import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { firmaValida, firmar } from "../firma";
import { leerWebhook } from "../payload";
import { clienteWhatsapp, clienteWhatsappReal, clienteWhatsappSimulado, whatsappSimulado, GRAPH_API_VERSION } from "../cliente";

const SECRETO = "secreto-de-prueba";

describe("firma del webhook", () => {
  const body = '{"object":"whatsapp_business_account","entry":[]}';

  it("acepta la firma correcta (sha256= + HMAC del body crudo)", () => {
    expect(firmaValida(body, firmar(body, SECRETO), SECRETO)).toBe(true);
    expect(firmaValida(body, firmar(body, SECRETO).toUpperCase().replace("SHA256=", "sha256="), SECRETO)).toBe(true);
  });

  it("rechaza firma de otro secreto, body alterado, sin prefijo, sin header o sin App Secret", () => {
    expect(firmaValida(body, firmar(body, "otro"), SECRETO)).toBe(false);
    expect(firmaValida(`${body} `, firmar(body, SECRETO), SECRETO)).toBe(false);
    expect(firmaValida(body, firmar(body, SECRETO).slice("sha256=".length), SECRETO)).toBe(false);
    expect(firmaValida(body, null, SECRETO)).toBe(false);
    expect(firmaValida(body, firmar(body, SECRETO), undefined)).toBe(false);
    expect(firmaValida(body, firmar(body, SECRETO), "")).toBe(false);
    expect(firmaValida(body, firmar(body, SECRETO), "   \n")).toBe(false);
  });

  it("ignora espacios y saltos de línea en los bordes del App Secret (pegado de más en Vercel)", () => {
    expect(firmaValida(body, firmar(body, SECRETO), ` ${SECRETO}\n`)).toBe(true);
    expect(firmaValida(body, firmar(body, SECRETO), `${SECRETO}\r\n`)).toBe(true);
    // Un espacio en el medio sí cambia el secreto.
    expect(firmaValida(body, firmar(body, SECRETO), "secreto de-prueba")).toBe(false);
  });

});

function webhook(value: Record<string, unknown>, field = "messages") {
  return { object: "whatsapp_business_account", entry: [{ id: "1", changes: [{ field, value: { messaging_product: "whatsapp", ...value } }] }] };
}

describe("leerWebhook", () => {
  it("lee texto, audio y otros tipos con el nombre del perfil", () => {
    const r = leerWebhook(
      webhook({
        contacts: [{ wa_id: "5493490000001", profile: { name: " Ana " } }],
        messages: [
          { from: "5493490000001", id: "wamid.1", timestamp: "1700000000", type: "text", text: { body: "Hola MOVARA" } },
          { from: "5493490000001", id: "wamid.2", timestamp: "1700000001", type: "audio", audio: { id: "x" } },
          { from: "5493490000002", id: "wamid.3", timestamp: "1700000002", type: "image" },
          { from: "5493490000001", id: "wamid.4", timestamp: "1700000003", type: "text" },
        ],
      }),
    );
    expect(r.estados).toEqual([]);
    expect(r.mensajes).toEqual([
      { waMessageId: "wamid.1", telefono: "5493490000001", nombrePerfil: "Ana", tipo: "TEXTO", contenido: "Hola MOVARA", enviadoEn: new Date(1700000000000) },
      { waMessageId: "wamid.2", telefono: "5493490000001", nombrePerfil: "Ana", tipo: "AUDIO", contenido: "", enviadoEn: new Date(1700000001000) },
      { waMessageId: "wamid.3", telefono: "5493490000002", nombrePerfil: null, tipo: "OTRO", contenido: "", enviadoEn: new Date(1700000002000) },
      { waMessageId: "wamid.4", telefono: "5493490000001", nombrePerfil: "Ana", tipo: "TEXTO", contenido: "", enviadoEn: new Date(1700000003000) },
    ]);
  });

  it("recorta textos muy largos a 4000 caracteres", () => {
    const r = leerWebhook(webhook({ messages: [{ from: "5493490000001", id: "w", timestamp: "1", type: "text", text: { body: "a".repeat(5000) } }] }));
    expect(r.mensajes[0].contenido).toHaveLength(4000);
  });

  it("lee estados de entrega (solo registro)", () => {
    const r = leerWebhook(webhook({ statuses: [{ id: "wamid.9", status: "delivered", timestamp: "1" }] }));
    expect(r).toEqual({ mensajes: [], estados: [{ waMessageId: "wamid.9", estado: "delivered" }] });
  });

  it("ignora otros campos, contactos sin nombre y payloads que no son de WhatsApp", () => {
    expect(leerWebhook(webhook({ messages: [{ from: "5493490000001", id: "w", timestamp: "1", type: "text", text: { body: "x" } }] }, "account_update"))).toEqual({ mensajes: [], estados: [] });
    expect(leerWebhook({ object: "page", entry: [] })).toEqual({ mensajes: [], estados: [] });
    expect(leerWebhook(null)).toEqual({ mensajes: [], estados: [] });
    expect(leerWebhook(webhook({ messages: [{ from: "abc", id: "w", timestamp: "1", type: "text" }] }))).toEqual({ mensajes: [], estados: [] });
    const r = leerWebhook(webhook({ contacts: [{ wa_id: "5493490000001" }], messages: [{ from: "5493490000001", id: "w", timestamp: "1", type: "text", text: { body: "x" } }] }));
    expect(r.mensajes[0].nombrePerfil).toBeNull();
    expect(leerWebhook(webhook({})).mensajes).toEqual([]);
  });
});

describe("cliente de WhatsApp", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "token-prueba");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("marca leído con indicador de escritura", async () => {
    fetchMock.mockResolvedValue(new Response('{"success":true}'));
    await clienteWhatsappReal.marcarLeidoYEscribiendo("wamid.1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://graph.facebook.com/${GRAPH_API_VERSION}/123/messages`);
    expect(init.headers.Authorization).toBe("Bearer token-prueba");
    expect(JSON.parse(init.body)).toEqual({ messaging_product: "whatsapp", status: "read", message_id: "wamid.1", typing_indicator: { type: "text" } });
  });

  it("si marcar leído falla, solo registra (sin el token)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 400 }));
    await clienteWhatsappReal.marcarLeidoYEscribiendo("wamid.1");
    fetchMock.mockRejectedValueOnce(new TypeError("red"));
    await clienteWhatsappReal.marcarLeidoYEscribiendo("wamid.1");
    const logs = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logs).toContain("HTTP 400");
    expect(logs).toContain("TypeError");
    expect(logs).not.toContain("token-prueba");
  });

  it("envía texto y devuelve el id del mensaje", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] })));
    expect(await clienteWhatsappReal.enviarTexto("5493490000001", "Hola")).toEqual({ ok: true, waMessageId: "wamid.out" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "5493490000001",
      type: "text",
      text: { body: "Hola" },
    });
    fetchMock.mockResolvedValue(new Response("no json"));
    expect(await clienteWhatsappReal.enviarTexto("5493490000001", "Hola")).toEqual({ ok: true, waMessageId: null });
  });

  it("errores de envío: HTTP, red y sin configurar", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    expect(await clienteWhatsappReal.enviarTexto("1", "x")).toEqual({ ok: false, error: "HTTP 401" });
    fetchMock.mockRejectedValueOnce(new TypeError("red"));
    expect(await clienteWhatsappReal.enviarTexto("1", "x")).toEqual({ ok: false, error: "TypeError" });
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
    expect(await clienteWhatsappReal.enviarTexto("1", "x")).toEqual({ ok: false, error: "Error" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("simulado: no llama a Meta y solo fuera de producción", async () => {
    await clienteWhatsappSimulado.marcarLeidoYEscribiendo("w");
    const r = await clienteWhatsappSimulado.enviarTexto("1", "x");
    expect(r.ok && r.waMessageId).toMatch(/^wamid\.simulado\./);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("WHATSAPP_SIMULADO", "1");
    expect(whatsappSimulado()).toBe(true);
    expect(clienteWhatsapp()).toBe(clienteWhatsappSimulado);
    vi.stubEnv("NODE_ENV", "production");
    expect(whatsappSimulado()).toBe(false);
    expect(clienteWhatsapp()).toBe(clienteWhatsappReal);
  });
});
