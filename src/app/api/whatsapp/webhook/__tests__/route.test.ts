// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { crearBaseFalsa } from "@/lib/bot-whatsapp/__tests__/base-falsa";
import { firmar } from "@/lib/whatsapp-cloud/firma";

const m = vi.hoisted(() => ({
  base: null as ReturnType<typeof import("@/lib/bot-whatsapp/__tests__/base-falsa").crearBaseFalsa> | null,
  despues: [] as (() => unknown)[],
  procesar: vi.fn(async () => "RESPONDIDO"),
  aviso: vi.fn(async () => true),
  permitirIP: vi.fn(async () => true),
  permitirClave: vi.fn(async () => true),
}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void m.despues.push(fn) }));
vi.mock("@/lib/db", () => ({
  get db() {
    return m.base!.db;
  },
}));
vi.mock("@/lib/bot-whatsapp/procesar", () => ({ procesarMensajeEntrante: m.procesar }));
vi.mock("@/lib/bot-whatsapp/avisos", async (orig) => ({ ...(await orig<typeof import("@/lib/bot-whatsapp/avisos")>()), enviarAviso: m.aviso }));
vi.mock("@/lib/seguridad/publico", async (orig) => ({ ...(await orig<typeof import("@/lib/seguridad/publico")>()), permitirIP: m.permitirIP, permitirClave: m.permitirClave }));

import { GET, POST, maxDuration } from "../route";

const SECRETO = "app-secret-de-prueba";

function payload(mensajes: Record<string, unknown>[] = [], statuses: Record<string, unknown>[] = []) {
  return JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messaging_product: "whatsapp", messages: mensajes, statuses } }] }] });
}
const texto = (id: string, body: string, from = "5493493667214") => ({ from, id, timestamp: "1763600000", type: "text", text: { body } });

function post(body: string, firma: string | null = firmar(body, SECRETO)) {
  return new NextRequest("http://localhost/api/whatsapp/webhook", { method: "POST", body, headers: firma ? { "x-hub-signature-256": firma } : {} });
}
async function correrDespues() {
  const fns = m.despues.splice(0);
  for (const f of fns) await f();
}

beforeEach(() => {
  m.base = crearBaseFalsa();
  m.base.tablas.config = { emailAviso: null };
  vi.stubEnv("WHATSAPP_APP_SECRET", SECRETO);
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "token-verificacion");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  m.despues.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  m.procesar.mockClear();
  m.aviso.mockClear();
  m.permitirIP.mockReset().mockResolvedValue(true);
  m.permitirClave.mockReset().mockResolvedValue(true);
});

describe("GET (verificación de Meta)", () => {
  const get = (q: string) => GET(new NextRequest(`http://localhost/api/whatsapp/webhook?${q}`));
  it("devuelve el challenge con el token correcto", async () => {
    const r = await get("hub.mode=subscribe&hub.verify_token=token-verificacion&hub.challenge=12345");
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("12345");
  });
  it("403 con token incorrecto, otro modo, sin challenge o sin token configurado", async () => {
    expect((await get("hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1")).status).toBe(403);
    expect((await get("hub.mode=unsubscribe&hub.verify_token=token-verificacion&hub.challenge=1")).status).toBe(403);
    expect((await get("hub.mode=subscribe&hub.verify_token=token-verificacion")).status).toBe(403);
    expect((await get("hub.mode=subscribe&hub.challenge=1")).status).toBe(403);
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
    expect((await get("hub.mode=subscribe&hub.verify_token=&hub.challenge=1")).status).toBe(403);
  });
});

describe("POST (mensajes)", () => {
  it("tiene maxDuration de 60 s para el procesamiento en after()", () => {
    expect(maxDuration).toBe(60);
  });

  it("firma inválida o ausente: 401 y no guarda nada", async () => {
    const body = payload([texto("wamid.1", "info")]);
    expect((await POST(post(body, firmar(body, "otro")))).status).toBe(401);
    expect((await POST(post(body, null))).status).toBe(401);
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    expect((await POST(post(body))).status).toBe(401);
    expect(m.base!.tablas.mensajes).toEqual([]);
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain(SECRETO);
  });


  it("App Secret con espacios o salto de línea en los bordes: igual acepta la firma", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", ` ${SECRETO}\n`);
    const body = payload([texto("wamid.1", "info")]);
    expect((await POST(post(body, firmar(body, SECRETO)))).status).toBe(200);
  });

  it("guarda el mensaje y el lead, responde 200 y procesa después", async () => {
    const r = await POST(post(payload([texto("wamid.1", "Hola, quería info")])));
    expect(r.status).toBe(200);
    expect(m.procesar).not.toHaveBeenCalled();
    const [lead] = m.base!.tablas.leads;
    expect(lead).toMatchObject({ telefono: "5493493667214" });
    expect(lead.ultimoEntranteEn).toBeInstanceOf(Date);
    expect(m.base!.tablas.mensajes[0]).toMatchObject({ leadId: lead.id, direccion: "ENTRANTE", autor: "CLIENTE", tipo: "TEXTO", contenido: "Hola, quería info", waMessageId: "wamid.1" });
    await correrDespues();
    expect(m.procesar).toHaveBeenCalledWith(lead.id, "wamid.1");
  });

  it("idempotencia: el mismo waMessageId no se guarda ni se procesa dos veces", async () => {
    const body = payload([texto("wamid.1", "info")]);
    await POST(post(body));
    await POST(post(body));
    expect(m.base!.tablas.mensajes).toHaveLength(1);
    await correrDespues();
    expect(m.procesar).toHaveBeenCalledTimes(1);
  });

  it("dos reintentos simultáneos: el índice único gana (P2002)", async () => {
    const original = m.base!.db.mensajeWhatsapp.findUnique;
    m.base!.db.mensajeWhatsapp.findUnique = async () => null;
    await POST(post(payload([texto("wamid.1", "info")])));
    expect((await POST(post(payload([texto("wamid.1", "info")])))).status).toBe(200);
    m.base!.db.mensajeWhatsapp.findUnique = original;
    expect(m.base!.tablas.mensajes).toHaveLength(1);
  });

  it("varios mensajes del mismo número: se procesa solo el último, con horas crecientes", async () => {
    await POST(post(payload([texto("wamid.1", "Hola"), texto("wamid.2", "info"), texto("wamid.3", "otro", "5493490000009")])));
    const [a, b2] = m.base!.tablas.mensajes;
    expect(b2.creadoEn.getTime()).toBeGreaterThan(a.creadoEn.getTime());
    await correrDespues();
    expect(m.procesar.mock.calls.map((c) => (c as unknown[])[1])).toEqual(["wamid.2", "wamid.3"]);
  });

  it("guarda audios aunque el bot no responda texto", async () => {
    await POST(post(payload([{ from: "5493493667214", id: "wamid.a", timestamp: "1", type: "audio", audio: { id: "x" } }])));
    expect(m.base!.tablas.mensajes[0]).toMatchObject({ tipo: "AUDIO", contenido: "" });
  });

  it("estados de entrega: solo se registran", async () => {
    await m.base!.db.mensajeWhatsapp.create({ data: { leadId: "l", direccion: "SALIENTE", autor: "BOT", tipo: "TEXTO", contenido: "x", waMessageId: "wamid.out" } });
    const r = await POST(post(payload([], [{ id: "wamid.out", status: "read" }])));
    expect(r.status).toBe(200);
    expect(m.base!.tablas.mensajes[0].estadoEntrega).toBe("read");
    expect(m.despues).toEqual([]);
  });

  it("firmado pero no es JSON o no es de WhatsApp: 200 sin hacer nada", async () => {
    expect((await POST(post("no es json"))).status).toBe(200);
    expect((await POST(post('{"object":"page"}'))).status).toBe(200);
    expect(m.base!.tablas.mensajes).toEqual([]);
  });

  it("rate limit por número: guarda pero no responde, y avisa una vez", async () => {
    m.permitirClave.mockImplementation(async (...args: unknown[]) => args[1] === "whatsapp-aviso-numero");
    await POST(post(payload([texto("wamid.1", "spam")])));
    expect(m.base!.tablas.mensajes).toHaveLength(1);
    await correrDespues();
    expect(m.procesar).not.toHaveBeenCalled();
    expect(m.aviso).toHaveBeenCalledTimes(1);
    expect(m.aviso.mock.calls[0]).toMatchObject([{ motivo: "RATE_LIMIT" }]);
    m.permitirClave.mockResolvedValue(false);
    await POST(post(payload([texto("wamid.2", "spam")])));
    await correrDespues();
    expect(m.aviso).toHaveBeenCalledTimes(1);
  });

  it("rate limit por IP: 429", async () => {
    m.permitirIP.mockResolvedValueOnce(false);
    expect((await POST(post(payload([texto("wamid.1", "x")])))).status).toBe(429);
  });

  it("body demasiado grande: 413", async () => {
    const body = payload([texto("wamid.1", "a".repeat(70 * 1024))]);
    expect((await POST(post(body))).status).toBe(413);
  });

  it("error de base: 500 para que Meta reintente, sin datos personales en el log", async () => {
    m.base!.db.leadWhatsapp.upsert = async () => {
      throw Object.assign(new Error("falló con 5493493667214"), { code: "P1001" });
    };
    expect((await POST(post(payload([texto("wamid.1", "x")])))).status).toBe(500);
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain("5493493667214");
    m.base!.db.mensajeWhatsapp.findUnique = async () => {
      throw new Error("x");
    };
    expect((await POST(post(payload([texto("wamid.2", "x")])))).status).toBe(500);
  });

  it("un error que no es de índice único al crear el mensaje: 500", async () => {
    m.base!.db.mensajeWhatsapp.create = async () => {
      throw Object.assign(new Error("x"), { code: "P1001" });
    };
    expect((await POST(post(payload([texto("wamid.1", "x")])))).status).toBe(500);
  });

  it("teléfono de otro país: se guarda con su código", async () => {
    await POST(post(payload([texto("wamid.1", "hi", "14155550123")])));
    expect(m.base!.tablas.leads[0].telefono).toBe("14155550123");
  });
});
