import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { firmaValida, firmar } from "../firma";
import { leerWebhook, textoDeRespuestaInteractiva } from "../payload";
import {
  clienteWhatsapp,
  clienteWhatsappReal,
  clienteWhatsappSimulado,
  whatsappSimulado,
  GRAPH_API_VERSION,
  resumenErrorMeta,
  sinNueveArgentino,
  cuerpoInteractivo,
} from "../cliente";

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

  it("respuesta a un botón o a una lista: se guarda como texto con el título que tocó el cliente", () => {
    const r = leerWebhook(
      webhook({
        messages: [
          { from: "5493490000001", id: "b", timestamp: "1", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "terreno_si", title: "Sí, tengo terreno" } } },
          { from: "5493490000001", id: "l", timestamp: "2", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "uso_vivir", title: "Para vivir", description: "x" } } },
          { from: "5493490000001", id: "p", timestamp: "3", type: "button", button: { text: "Quiero info", payload: "x" } },
          { from: "5493490000001", id: "v", timestamp: "4", type: "interactive", interactive: { type: "nfm_reply" } },
        ],
      }),
    );
    expect(r.mensajes.map((m) => [m.tipo, m.contenido])).toEqual([
      ["TEXTO", "Sí, tengo terreno"],
      ["TEXTO", "Para vivir"],
      ["TEXTO", "Quiero info"],
      ["OTRO", ""],
    ]);
    expect(textoDeRespuestaInteractiva({ from: "1", id: "x", timestamp: "1", type: "button" })).toBeNull();
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

  it("envía botones (interactive button) y listas (interactive list)", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] })));
    const botones = { tipo: "botones" as const, opciones: [{ id: "a", titulo: "Sí" }, { id: "b", titulo: "No" }] };
    expect(await clienteWhatsappReal.enviarTexto("5493490000001", "¿Tenés terreno?", botones)).toEqual({ ok: true, waMessageId: "wamid.out" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "5493490000001",
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "¿Tenés terreno?" },
        action: { buttons: [{ type: "reply", reply: { id: "a", title: "Sí" } }, { type: "reply", reply: { id: "b", title: "No" } }] },
      },
    });
    const lista = { tipo: "lista" as const, boton: "Elegir", opciones: [{ id: "u", titulo: "Para vivir" }] };
    await clienteWhatsappReal.enviarTexto("5493490000001", "¿Para qué?", lista);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).interactive).toEqual({
      type: "list",
      body: { text: "¿Para qué?" },
      action: { button: "Elegir", sections: [{ rows: [{ id: "u", title: "Para vivir" }] }] },
    });
  });

  it("interactivo fuera de los límites de Meta: no se manda", async () => {
    const largo = { tipo: "botones" as const, opciones: [{ id: "a", titulo: "x".repeat(21) }] };
    expect(await clienteWhatsappReal.enviarTexto("1", "hola", largo)).toEqual({ ok: false, error: "Error" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(() => cuerpoInteractivo("", largo)).toThrow("Texto inválido");
    expect(() => cuerpoInteractivo("x".repeat(1025), largo)).toThrow("Texto inválido");
    expect(() => cuerpoInteractivo("hola", largo)).toThrow("Opciones inválidas");
    expect(() => cuerpoInteractivo("hola", { tipo: "botones", opciones: [] })).toThrow("Opciones inválidas");
    expect(() => cuerpoInteractivo("hola", { tipo: "botones", opciones: Array.from({ length: 4 }, (_, i) => ({ id: `${i}`, titulo: "a" })) })).toThrow("Opciones inválidas");
    expect(() => cuerpoInteractivo("hola", { tipo: "botones", opciones: [{ id: "", titulo: "a" }] })).toThrow("Opciones inválidas");
    expect(() => cuerpoInteractivo("hola", { tipo: "lista", boton: "", opciones: [{ id: "a", titulo: "x".repeat(24) }] })).toThrow("Botón de lista inválido");
    expect(() => cuerpoInteractivo("hola", { tipo: "lista", boton: "x".repeat(21), opciones: [{ id: "a", titulo: "a" }] })).toThrow("Botón de lista inválido");
  });

  it("interactivo con 131030 y 549: reintenta sin el 9 con el mismo contenido", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 131030, title: "Recipient phone number not in allowed list" } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "wamid.ok" }] })));
    vi.spyOn(console, "info").mockImplementation(() => {});
    const botones = { tipo: "botones" as const, opciones: [{ id: "a", titulo: "Sí" }] };
    expect(await clienteWhatsappReal.enviarTexto("5493493123456", "¿Terreno?", botones)).toEqual({ ok: true, waMessageId: "wamid.ok" });
    const [a, b] = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body));
    expect([a.to, b.to]).toEqual(["5493493123456", "543493123456"]);
    expect(b.interactive).toEqual(a.interactive);
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

  const errorMeta = (code: number, message: string, extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ error: { message, type: "OAuthException", code, ...extra, fbtrace_id: "x" } }), { status: 400 });
  const NO_PERMITIDO = "(#131030) Recipient phone number not in allowed list";

  it("resumen del error de Meta: código, subcódigo y título, sin números ni detalles", () => {
    expect(
      resumenErrorMeta(400, {
        error: { message: NO_PERMITIDO, code: 131030, error_subcode: 2494010, error_data: { details: "Add 5493490000001 to the list" } },
      }),
    ).toEqual({ texto: "HTTP 400 · código 131030 · subcódigo 2494010 · Recipient phone number not in allowed list", codigo: 131030, titulo: "Recipient phone number not in allowed list" });
    // Prefiere `title`; tapa cualquier número que venga en el texto.
    expect(resumenErrorMeta(400, { error: { title: "Invalid number +54 9 3490 000001", message: "otro", code: 100 } }).texto).toBe(
      "HTTP 400 · código 100 · Invalid number [número]",
    );
    expect(resumenErrorMeta(500, null)).toEqual({ texto: "HTTP 500", codigo: null, titulo: "" });
    expect(resumenErrorMeta(400, { error: { code: "x", error_subcode: "y", message: 5 } }).texto).toBe("HTTP 400");
  });

  it("formato argentino sin 9: solo celulares 549 de 13 dígitos", () => {
    expect(sinNueveArgentino("5493493123456")).toBe("543493123456");
    expect(sinNueveArgentino("543493123456")).toBeNull();
    expect(sinNueveArgentino("549349312345")).toBeNull();
    expect(sinNueveArgentino("5213312345678")).toBeNull();
  });

  it("131030 con un 549: reintenta una vez sin el 9 y registra qué formato funcionó (sin el número)", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(errorMeta(131030, NO_PERMITIDO)).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "wamid.sin9" }] })));
    expect(await clienteWhatsappReal.enviarTexto("5493493123456", "Hola")).toEqual({ ok: true, waMessageId: "wamid.sin9" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe("5493493123456");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ to: "543493123456", text: { body: "Hola" } });
    const info = vi.mocked(console.info).mock.calls.flat().join(" ");
    expect(info).toContain("sin 9");
    expect(info).not.toMatch(/3493123456|Hola/);
  });

  it("si el reintento sin 9 también falla, devuelve los dos errores (sin el número)", async () => {
    fetchMock.mockResolvedValueOnce(errorMeta(131030, NO_PERMITIDO)).mockResolvedValueOnce(errorMeta(131030, NO_PERMITIDO));
    const r = await clienteWhatsappReal.enviarTexto("5493493123456", "Hola");
    expect(r).toEqual({
      ok: false,
      error: "549: HTTP 400 · código 131030 · Recipient phone number not in allowed list | sin 9: HTTP 400 · código 131030 · Recipient phone number not in allowed list",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(r)).not.toContain("3493123456");
  });

  it("reconoce el destinatario no permitido también por el título, sin código", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Recipient phone number not in allowed list" } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "wamid.2" }] })));
    expect(await clienteWhatsappReal.enviarTexto("5493493123456", "Hola")).toEqual({ ok: true, waMessageId: "wamid.2" });
  });

  it("no reintenta con otro error, con un número que no es 549 ni si el primer envío anda", async () => {
    fetchMock.mockResolvedValueOnce(errorMeta(100, "(#100) Invalid parameter", { error_subcode: 33 }));
    expect(await clienteWhatsappReal.enviarTexto("5493493123456", "Hola")).toEqual({ ok: false, error: "HTTP 400 · código 100 · subcódigo 33 · Invalid parameter" });
    fetchMock.mockResolvedValueOnce(errorMeta(131030, NO_PERMITIDO));
    expect(await clienteWhatsappReal.enviarTexto("543493123456", "Hola")).toEqual({ ok: false, error: "HTTP 400 · código 131030 · Recipient phone number not in allowed list" });
    fetchMock.mockRejectedValueOnce(new TypeError("red"));
    expect(await clienteWhatsappReal.enviarTexto("5493493123456", "Hola")).toEqual({ ok: false, error: "TypeError" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
