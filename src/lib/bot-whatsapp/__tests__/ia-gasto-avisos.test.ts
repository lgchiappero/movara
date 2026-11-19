// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Anthropic from "@anthropic-ai/sdk";

const m = vi.hoisted(() => ({ upsert: vi.fn(), updateMany: vi.fn(), enviarEmail: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { usoBot: { upsert: m.upsert, updateMany: m.updateMany } } }));
vi.mock("@/lib/email/enviar", () => ({ enviarEmail: m.enviarEmail, esEmailDePrueba: (e: string) => e.endsWith("@example.com") }));

import { armarMensajes, crearMotorClaude, motorSimulado, motorIA, iaSimulada, MODELO_BOT, type MensajeHistorial } from "../ia";
import { costoDeLlamada, registrarUso, PRECIOS_MODELO } from "../gasto";
import { enviarAviso, htmlAviso, destinoAvisos, linkLead } from "../avisos";
import { respuestaBotSchema, respuestaUtilizable, type RespuestaBot } from "../respuesta";
import { PROMPT_SISTEMA, FRASE_DERIVACION } from "../prompt";

const cliente = (contenido: string, tipo: MensajeHistorial["tipo"] = "TEXTO"): MensajeHistorial => ({ autor: "CLIENTE", tipo, contenido });
const bot = (contenido: string): MensajeHistorial => ({ autor: "BOT", tipo: "TEXTO", contenido });

const VACIOS = { nombre: null, uso: null, zona: null, terreno: null, personas: null, plazo: null, origen: null, origenDetalle: null };
const RESPUESTA: RespuestaBot = { esLead: true, respuesta: "¡Hola! ¿Para qué la pensás?", datosExtraidos: VACIOS, accion: "RESPONDER", motivo: "saludo" };
const USO = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 3000 };

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  m.upsert.mockReset();
  m.updateMany.mockReset();
  m.enviarEmail.mockReset();
});

describe("prompt de sistema", () => {
  it("tiene identidad, límites, la frase de derivación y los 3 ejemplos; sin datos variables", () => {
    for (const t of ["Soy el asistente de MOVARA", "Precios", "Permisos municipales", FRASE_DERIVACION, "[Familia]", "[Pregunta solo el precio]", "[Recomendado]", "Sunchales"]) {
      expect(PROMPT_SISTEMA).toContain(t);
    }
    expect(PROMPT_SISTEMA).not.toMatch(/\d{4}-\d{2}-\d{2}|plegable[^s"]/i);
    // El mínimo cacheable de Haiku 5.5 son 512 tokens (~4 caracteres por token).
    expect(PROMPT_SISTEMA.length).toBeGreaterThan(512 * 4);
  });
});

describe("esquema de respuesta", () => {
  it("valida la salida y rechaza acciones u orígenes desconocidos", () => {
    expect(respuestaBotSchema.safeParse(RESPUESTA).success).toBe(true);
    expect(respuestaBotSchema.safeParse({ ...RESPUESTA, accion: "VENDER" }).success).toBe(false);
    expect(respuestaBotSchema.safeParse({ ...RESPUESTA, datosExtraidos: { ...VACIOS, origen: "TV" } }).success).toBe(false);
    expect(respuestaBotSchema.safeParse({ ...RESPUESTA, datosExtraidos: undefined }).success).toBe(false);
  });
  it("una respuesta vacía solo sirve para NO_RESPONDER", () => {
    expect(respuestaUtilizable(RESPUESTA)).toBe(true);
    expect(respuestaUtilizable({ ...RESPUESTA, respuesta: "  " })).toBe(false);
    expect(respuestaUtilizable({ ...RESPUESTA, respuesta: "", accion: "NO_RESPONDER" })).toBe(true);
  });
});

describe("armarMensajes", () => {
  it("cliente = user, bot y equipo = assistant; une turnos seguidos y describe audios", () => {
    const r = armarMensajes([cliente("Hola"), cliente("", "AUDIO"), bot("¡Hola!"), { autor: "EQUIPO", tipo: "TEXTO", contenido: "Soy Luciano" }, cliente("", "OTRO")], {});
    expect(r).toEqual([
      { role: "user", content: "Hola\n[mandó un audio]" },
      { role: "assistant", content: "¡Hola!\nSoy Luciano" },
      { role: "user", content: "[mandó un archivo o mensaje que no es texto]" },
    ]);
  });
  it("arranca y termina con el cliente (sin prefill) y saltea vacíos", () => {
    expect(armarMensajes([bot("viejo"), cliente(" "), cliente("Hola"), bot("¿Qué buscás?")], {})).toEqual([{ role: "user", content: "Hola" }]);
    expect(armarMensajes([bot("solo bot")], {})).toEqual([]);
  });
  it("agrega los datos ya registrados al último turno y recorta el historial", () => {
    const r = armarMensajes([cliente("Hola")], { nombre: "Ana", zona: null, uso: "vivir" });
    expect(r[0].content).toContain("datos ya registrados del contacto: nombre=Ana; uso=vivir]");
    const largo = Array.from({ length: 30 }, (_, i) => (i % 2 ? bot(`b${i}`) : cliente(`c${i}`)));
    expect(armarMensajes(largo, {})[0].content).toBe("c10");
  });
});

describe("motor de Claude (cliente simulado)", () => {
  function clienteFalso(impl: () => Promise<unknown>) {
    const parse = vi.fn<(params: unknown) => Promise<unknown>>(impl);
    return { parse, motor: crearMotorClaude({ messages: { parse } } as unknown as Pick<Anthropic, "messages">) };
  }

  it("llama a Haiku 5.5 con el prompt cacheado, effort low y salida estructurada", async () => {
    const { parse, motor } = clienteFalso(async () => ({ stop_reason: "end_turn", usage: USO, parsed_output: RESPUESTA }));
    expect(await motor.responder([cliente("Hola")], {})).toEqual({ ok: true, respuesta: RESPUESTA, uso: USO });
    const p = parse.mock.calls[0][0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(p.model).toBe(MODELO_BOT);
    expect(p.model).toBe("claude-haiku-5-5");
    expect(p.system).toEqual([{ type: "text", text: PROMPT_SISTEMA, cache_control: { type: "ephemeral" } }]);
    expect(p.output_config.effort).toBe("low");
    expect(p.output_config.format.type).toBe("json_schema");
    expect(p.messages).toEqual([{ role: "user", content: "Hola" }]);
    expect(p).not.toHaveProperty("temperature");
  });

  it("negativa, salida nula o vacía → no se responde (pero se registra el uso)", async () => {
    expect(await clienteFalso(async () => ({ stop_reason: "refusal", usage: USO, parsed_output: null })).motor.responder([cliente("x")], {})).toEqual({ ok: false, motivo: "NEGATIVA", uso: USO });
    expect(await clienteFalso(async () => ({ stop_reason: "max_tokens", usage: USO, parsed_output: null })).motor.responder([cliente("x")], {})).toEqual({ ok: false, motivo: "INVALIDO", uso: USO });
    expect(await clienteFalso(async () => ({ stop_reason: "end_turn", usage: USO, parsed_output: { ...RESPUESTA, respuesta: "" } })).motor.responder([cliente("x")], {})).toEqual({
      ok: false,
      motivo: "INVALIDO",
      uso: USO,
    });
  });

  it("JSON que no valida (AnthropicError del SDK) → INVALIDO; error de la API → ERROR", async () => {
    expect(await clienteFalso(async () => Promise.reject(new Anthropic.AnthropicError("Failed to parse structured output"))).motor.responder([cliente("x")], {})).toEqual({
      ok: false,
      motivo: "INVALIDO",
      uso: null,
    });
    const apiError = new Anthropic.APIError(529, {}, "overloaded", new Headers());
    expect(await clienteFalso(async () => Promise.reject(apiError)).motor.responder([cliente("x")], {})).toEqual({ ok: false, motivo: "ERROR", uso: null });
    expect(await clienteFalso(async () => Promise.reject(new TypeError("red"))).motor.responder([cliente("x")], {})).toEqual({ ok: false, motivo: "ERROR", uso: null });
  });

  it("sin mensajes del cliente no llama a la API", async () => {
    const { parse, motor } = clienteFalso(async () => ({}));
    expect(await motor.responder([bot("hola")], {})).toEqual({ ok: false, motivo: "INVALIDO", uso: null });
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("IA simulada", () => {
  it("se usa solo con BOT_IA_SIMULADA=1 fuera de producción", () => {
    expect(iaSimulada()).toBe(false);
    vi.stubEnv("BOT_IA_SIMULADA", "1");
    expect(motorIA()).toBe(motorSimulado);
    vi.stubEnv("NODE_ENV", "production");
    expect(iaSimulada()).toBe(false);
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-falsa");
    expect(motorIA()).not.toBe(motorSimulado);
  });

  it("conversación completa hasta CALIFICADO", async () => {
    const h: MensajeHistorial[] = [cliente("Hola, quería info de las casas")];
    const datos: Record<string, string | null> = {};
    const pasos: string[] = [];
    for (const contesta of ["Para vivir", "Rafaela", "El año que viene", "Ana"]) {
      const r = await motorSimulado.responder(h, datos);
      if (!r.ok) throw new Error("falló");
      pasos.push(r.respuesta.accion);
      Object.assign(datos, Object.fromEntries(Object.entries(r.respuesta.datosExtraidos).filter(([, v]) => v)));
      h.push(bot(r.respuesta.respuesta), cliente(contesta));
    }
    const fin = await motorSimulado.responder(h, datos);
    expect(pasos).toEqual(["RESPONDER", "RESPONDER", "RESPONDER", "RESPONDER"]);
    expect(fin.ok && fin.respuesta.accion).toBe("CALIFICADO");
    expect(fin.ok && fin.respuesta.datosExtraidos).toMatchObject({ uso: "Para vivir", zona: "Rafaela", plazo: "El año que viene", nombre: "Ana" });
  });

  it("no lead, derivación y fallas a pedido", async () => {
    const noLead = await motorSimulado.responder([cliente("¿Venís al asado?")], {});
    expect(noLead.ok && noLead.respuesta).toMatchObject({ esLead: false, accion: "NO_RESPONDER" });
    const deriva = await motorSimulado.responder([cliente("info"), bot("¿Para qué?"), cliente("Quiero hablar con una persona")], {});
    expect(deriva.ok && deriva.respuesta.accion).toBe("DERIVAR");
    expect((await motorSimulado.responder([cliente("casa #invalido")], {})).ok).toBe(false);
    expect(await motorSimulado.responder([cliente("casa #negativa")], {})).toMatchObject({ ok: false, motivo: "NEGATIVA" });
    expect(await motorSimulado.responder([cliente("casa #error")], {})).toMatchObject({ ok: false, motivo: "ERROR", uso: null });
    expect((await motorSimulado.responder([], {})).ok).toBe(true);
  });
});

describe("gasto", () => {
  it("costo por llamada con precios de entrada, salida y caché", () => {
    expect(costoDeLlamada({ input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(PRECIOS_MODELO.entrada);
    expect(costoDeLlamada({ input_tokens: 0, output_tokens: 1_000_000 })).toBeCloseTo(0.5);
    expect(costoDeLlamada({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 })).toBeCloseTo(0.135);
    expect(costoDeLlamada({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: null, cache_read_input_tokens: null })).toBe(0);
  });

  it("suma al mes y avisa el 80 % una sola vez", async () => {
    const ahora = new Date("2026-11-19T15:00:00Z");
    m.upsert.mockResolvedValueOnce({ costoUsd: 1, avisoOchentaEn: null });
    expect(await registrarUso(USO, 5, ahora)).toEqual({ costoUsd: 1, avisarOchenta: false });
    expect(m.upsert.mock.calls[0][0]).toMatchObject({ where: { mes: "2026-11" }, create: { mes: "2026-11", tokensEntrada: 3100, tokensSalida: 50, llamadas: 1 } });
    expect(m.updateMany).not.toHaveBeenCalled();

    m.upsert.mockResolvedValueOnce({ costoUsd: 4, avisoOchentaEn: null });
    m.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await registrarUso(USO, 5, ahora)).toEqual({ costoUsd: 4, avisarOchenta: true });
    expect(m.updateMany).toHaveBeenCalledWith({ where: { mes: "2026-11", avisoOchentaEn: null }, data: { avisoOchentaEn: ahora } });

    // Otra llamada ganó la marca, o ya estaba avisado.
    m.upsert.mockResolvedValueOnce({ costoUsd: 4.1, avisoOchentaEn: null });
    m.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await registrarUso(USO, 5, ahora)).avisarOchenta).toBe(false);
    m.upsert.mockResolvedValueOnce({ costoUsd: 4.2, avisoOchentaEn: ahora });
    expect((await registrarUso(USO, 5)).avisarOchenta).toBe(false);
    expect(m.updateMany).toHaveBeenCalledTimes(2);
  });
});

describe("avisos por email", () => {
  const lead = { id: "lead 1", telefono: "5493493667214", nombre: "Ana <b>" };

  it("destino: el de la config o CONTACT_EMAIL", () => {
    expect(destinoAvisos("a@b.com")).toBe("a@b.com");
    vi.stubEnv("CONTACT_EMAIL", "c@d.com");
    expect(destinoAvisos(null)).toBe("c@d.com");
    vi.stubEnv("CONTACT_EMAIL", "");
    expect(destinoAvisos(null)).toBeNull();
  });

  it("HTML escapado con link al lead en el admin", () => {
    expect(linkLead("lead 1")).toBe("https://movara.com.ar/admin/bot-whatsapp/lead%201");
    const html = htmlAviso({ motivo: "CALIFICADO", destino: "x", lead, detalle: "datos <completos>" });
    expect(html).toContain("Ana &lt;b&gt; (+54 9 3493 66-7214)");
    expect(html).toContain("datos &lt;completos&gt;");
    expect(html).toContain('href="https://movara.com.ar/admin/bot-whatsapp/lead%201"');
    const sinLead = htmlAviso({ motivo: "GASTO_80", destino: "x" }, "http://localhost:3000");
    expect(sinLead).toContain('href="http://localhost:3000/admin/bot-whatsapp"');
    expect(htmlAviso({ motivo: "AUDIO", destino: "x", lead: { ...lead, nombre: null } })).toContain("Contacto: +54 9 3493 66-7214");
  });

  it("envía por Resend y nunca lanza", async () => {
    m.enviarEmail.mockResolvedValueOnce({ ok: true });
    expect(await enviarAviso({ motivo: "DERIVADO", destino: "a@b.com", lead })).toBe(true);
    expect(m.enviarEmail.mock.calls[0][0]).toMatchObject({ to: "a@b.com", subject: "MOVARA bot: El bot te derivó una conversación" });
    expect(m.enviarEmail.mock.calls[0][1]).toEqual({ prueba: false });
    m.enviarEmail.mockResolvedValueOnce({ ok: true });
    await enviarAviso({ motivo: "AUDIO", destino: "e2e@example.com", lead });
    expect(m.enviarEmail.mock.calls[1][1]).toEqual({ prueba: true });
    m.enviarEmail.mockResolvedValueOnce({ ok: false, error: "timeout" });
    expect(await enviarAviso({ motivo: "AUDIO", destino: "a@b.com", lead })).toBe(false);
    m.enviarEmail.mockRejectedValueOnce(new Error("boom"));
    expect(await enviarAviso({ motivo: "AUDIO", destino: "a@b.com", lead })).toBe(false);
    expect(await enviarAviso({ motivo: "AUDIO", destino: null, lead })).toBe(false);
    expect(m.enviarEmail).toHaveBeenCalledTimes(4);
    const logs = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logs).not.toContain("3493");
    expect(logs).not.toContain("a@b.com");
  });
});
