// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearBaseFalsa } from "./base-falsa";

const base = vi.hoisted(() => ({ actual: null as ReturnType<typeof import("./base-falsa").crearBaseFalsa> | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.actual!.db;
  },
}));

import { procesarMensajeEntrante, datosNuevos, ESPERA_AGRUPAR_MS, dependenciasReales, factorEsperas, type Dependencias } from "../procesar";
import { motorSimulado, motorSinClave, type MotorIA, type ResultadoIA } from "../ia";
import { MENSAJE_CIERRE_MAXIMO, MENSAJE_SIN_AUDIO } from "../constantes";
import type { RespuestaBot } from "../respuesta";
import type { LeadWhatsapp } from "@prisma/client";

const AHORA = new Date("2026-11-20T01:00:00Z"); // jueves 22:00 en Córdoba
const VACIOS = { nombre: null, uso: null, zona: null, terreno: null, personas: null, plazo: null, origen: null, origenDetalle: null };

let b: ReturnType<typeof crearBaseFalsa>;
let deps: Dependencias & { enviados: string[]; avisos: string[]; esperas: number[]; leidos: string[] };

function respuestaIA(r: Partial<RespuestaBot>): MotorIA {
  return { responder: vi.fn(async (): Promise<ResultadoIA> => ({ ok: true, uso: { input_tokens: 10, output_tokens: 10 }, respuesta: { esLead: true, respuesta: "Hola", datosExtraidos: VACIOS, accion: "RESPONDER", motivo: "m", ...r } })) };
}

beforeEach(() => {
  b = crearBaseFalsa();
  base.actual = b;
  b.tablas.config = { activo: true, modoHorario: false, horarioAtencion: {}, modoRespaldo: "MENSAJE_BIENVENIDA", mensajeBienvenida: "¡Hola! Gracias por escribir a MOVARA.", topeGastoMensualUsd: 5, emailAviso: "luciano@example.com", maxRespuestasPorLead: 6 };
  const enviados: string[] = [];
  const avisos: string[] = [];
  const esperas: number[] = [];
  const leidos: string[] = [];
  let reloj = AHORA.getTime();
  deps = {
    enviados,
    avisos,
    esperas,
    leidos,
    ia: motorSimulado,
    whatsapp: {
      marcarLeidoYEscribiendo: async (id) => void leidos.push(id),
      enviarTexto: async (_tel, texto) => {
        enviados.push(texto);
        return { ok: true, waMessageId: `wamid.out.${enviados.length}` };
      },
    },
    esperar: async (ms) => {
      esperas.push(ms);
      reloj += ms;
    },
    ahora: () => new Date(reloj),
    avisar: async (a) => {
      avisos.push(a.motivo);
      return true;
    },
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

function lead(datos: Partial<LeadWhatsapp> = {}) {
  return b.crearLead({ ultimoEntranteEn: AHORA, ...datos });
}
async function entra(leadId: string, contenido: string, tipo = "TEXTO") {
  const m = await b.db.mensajeWhatsapp.create({ data: { leadId, direccion: "ENTRANTE", autor: "CLIENTE", tipo, contenido, waMessageId: `wamid.in.${Math.random()}`, creadoEn: AHORA } });
  return m.waMessageId as string;
}
const leadDe = (id: string) => b.tablas.leads.find((l) => l.id === id)!;
const salientes = () => b.tablas.mensajes.filter((m) => m.direccion === "SALIENTE");

describe("procesarMensajeEntrante", () => {
  it("responde con la IA, espera para agrupar, marca leído y guarda el saliente", async () => {
    const l = lead();
    const wa = await entra(l.id, "Hola, quería info de las casas");
    expect(await procesarMensajeEntrante(l.id, wa, deps)).toBe("RESPONDIDO");
    expect(deps.esperas[0]).toBe(ESPERA_AGRUPAR_MS);
    expect(deps.leidos).toEqual([wa]);
    expect(deps.enviados).toHaveLength(1);
    expect(salientes()[0]).toMatchObject({ autor: "BOT", waMessageId: "wamid.out.1", estadoEntrega: "sent" });
    expect(leadDe(l.id)).toMatchObject({ respuestasBot: 1, bloqueoHasta: null });
    expect(b.tablas.uso[0]).toMatchObject({ mes: "2026-11", llamadas: 1 });
    // Demora humana: entre 5 y 20 s.
    expect(deps.esperas[1]).toBeGreaterThanOrEqual(5_000);
    expect(deps.esperas[1]).toBeLessThanOrEqual(20_000);
  });

  it("varios mensajes seguidos: solo responde la invocación del último, una vez a todos", async () => {
    const l = lead();
    const ia = respuestaIA({});
    deps.ia = ia;
    const w1 = await entra(l.id, "Hola");
    const w2 = await entra(l.id, "quería info de las casas");
    expect(await procesarMensajeEntrante(l.id, w1, deps)).toBe("OTRO_MENSAJE_MAS_NUEVO");
    expect(await procesarMensajeEntrante(l.id, w2, deps)).toBe("RESPONDIDO");
    expect(deps.enviados).toHaveLength(1);
    expect(vi.mocked(ia.responder).mock.calls[0][0].map((m) => m.contenido)).toEqual(["Hola", "quería info de las casas"]);
  });

  it("bloqueo: si otro proceso lo tiene, espera; si nunca se libera, no responde", async () => {
    const l = lead({ bloqueoHasta: new Date(AHORA.getTime() + 10_000) });
    const wa = await entra(l.id, "info");
    expect(await procesarMensajeEntrante(l.id, wa, deps)).toBe("RESPONDIDO");
    expect(deps.esperas.filter((e) => e === 3_000).length).toBeGreaterThan(0);

    const l2 = lead({ telefono: "5493490000002", bloqueoHasta: new Date(AHORA.getTime() + 600_000) });
    const wa2 = await entra(l2.id, "info");
    deps.enviados.length = 0;
    expect(await procesarMensajeEntrante(l2.id, wa2, deps)).toBe("SIN_BLOQUEO");
    expect(deps.enviados).toEqual([]);
  });

  it("si al tomar el bloqueo ya no hay pendientes (los respondió otro), no hace nada", async () => {
    const l = lead();
    const wa = await entra(l.id, "info");
    await b.db.mensajeWhatsapp.create({ data: { leadId: l.id, direccion: "SALIENTE", autor: "BOT", tipo: "TEXTO", contenido: "ya", creadoEn: AHORA } });
    // El último ENTRANTE sigue siendo `wa`.
    expect(await procesarMensajeEntrante(l.id, wa, deps)).toBe("NADA_SIN_PENDIENTES");
  });

  it("pausado: no responde nada y no llama a la IA", async () => {
    b.tablas.config!.activo = false;
    const ia = respuestaIA({});
    deps.ia = ia;
    const l = lead();
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "info"), deps)).toBe("NADA_PAUSADO");
    expect(ia.responder).not.toHaveBeenCalled();
    expect(deps.enviados).toEqual([]);
    expect(deps.leidos).toEqual([]);
  });

  it("deja en el log el resultado de cada mensaje, sin número ni texto", async () => {
    b.tablas.config!.activo = false;
    const l = lead();
    await procesarMensajeEntrante(l.id, await entra(l.id, "quiero info de la casa"), deps);
    b.tablas.config!.activo = true;
    deps.ia = respuestaIA({});
    await procesarMensajeEntrante(l.id, await entra(l.id, "para vivir"), deps);
    const log = vi.mocked(console.info).mock.calls.flat().join("\n");
    expect(log).toContain("[bot-whatsapp] Resultado: NADA_PAUSADO");
    expect(log).toContain("[bot-whatsapp] Resultado: RESPONDIDO");
    expect(log).not.toContain(l.telefono);
    expect(log).not.toMatch(/quiero info|para vivir/);
  });

  it("excluidos y control humano: no responde", async () => {
    const l = lead();
    b.tablas.excluidos.push({ telefono: l.telefono });
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "info"), deps)).toBe("NADA_EXCLUIDO");
    const l2 = lead({ telefono: "5493490000002", controlHumano: true });
    expect(await procesarMensajeEntrante(l2.id, await entra(l2.id, "info"), deps)).toBe("NADA_CONTROL_HUMANO");
    expect(deps.enviados).toEqual([]);
  });

  it("tope de gasto: bienvenida una sola vez a un número nuevo que pasa el filtro", async () => {
    b.tablas.uso.push({ mes: "2026-11", costoUsd: 5, avisoOchentaEn: AHORA });
    const ia = respuestaIA({});
    deps.ia = ia;
    const l = lead();
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "Hola, precio de las casas?"), deps)).toBe("RESPONDIDO");
    expect(deps.enviados).toEqual(["¡Hola! Gracias por escribir a MOVARA."]);
    expect(leadDe(l.id).bienvenidaEnviadaEn).toBeInstanceOf(Date);
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "hola?"), deps)).toBe("NADA_SIN_SALDO");
    const l2 = lead({ telefono: "5493490000002" });
    expect(await procesarMensajeEntrante(l2.id, await entra(l2.id, "¿venís al asado?"), deps)).toBe("NADA_SIN_SALDO");
    expect(ia.responder).not.toHaveBeenCalled();
    expect(deps.enviados).toHaveLength(1);
  });

  it("80 % del tope: avisa una sola vez", async () => {
    b.tablas.uso.push({ mes: "2026-11", costoUsd: 3.99999, avisoOchentaEn: null, llamadas: 0, tokensEntrada: 0, tokensSalida: 0 });
    const l = lead();
    await procesarMensajeEntrante(l.id, await entra(l.id, "info de las casas"), deps);
    await procesarMensajeEntrante(l.id, await entra(l.id, "para vivir"), deps);
    expect(deps.avisos.filter((a) => a === "GASTO_80")).toHaveLength(1);
  });

  it("número nuevo que no es lead: no responde y queda DESCARTADO", async () => {
    const l = lead();
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "¿Venís el sábado al asado?"), deps)).toBe("NO_ES_LEAD");
    expect(leadDe(l.id).estado).toBe("DESCARTADO");
    expect(deps.enviados).toEqual([]);
    // Ya en conversación, un "no es lead" no lo descarta.
    const l2 = lead({ telefono: "5493490000002", respuestasBot: 2 });
    deps.ia = respuestaIA({ esLead: false });
    expect(await procesarMensajeEntrante(l2.id, await entra(l2.id, "x"), deps)).toBe("NO_ES_LEAD");
    expect(leadDe(l2.id).estado).toBe("NUEVO");
  });

  it("NO_RESPONDER de un lead: guarda datos y no manda nada", async () => {
    deps.ia = respuestaIA({ accion: "NO_RESPONDER", respuesta: "", datosExtraidos: { ...VACIOS, zona: "Rafaela" } });
    const l = lead();
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "ok"), deps)).toBe("NO_RESPONDER");
    expect(leadDe(l.id).zona).toBe("Rafaela");
    expect(deps.enviados).toEqual([]);
  });

  it("CALIFICADO: cierre del bot, después control humano y aviso", async () => {
    deps.ia = respuestaIA({ accion: "CALIFICADO", respuesta: "Gracias, Ana. Luciano te escribe.", datosExtraidos: { ...VACIOS, nombre: "Ana", origen: "RECOMENDACION", origenDetalle: "Martín" } });
    const l = lead();
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "Ana"), deps)).toBe("RESPONDIDO");
    expect(deps.enviados).toEqual(["Gracias, Ana. Luciano te escribe."]);
    expect(leadDe(l.id)).toMatchObject({ estado: "CALIFICADO", controlHumano: true, nombre: "Ana", origen: "RECOMENDACION", origenDetalle: "Martín" });
    expect(deps.avisos).toEqual(["CALIFICADO"]);
  });

  it("DERIVAR: mensaje, DERIVADO, control humano y aviso", async () => {
    const l = lead();
    await entra(l.id, "info");
    await b.db.mensajeWhatsapp.create({ data: { leadId: l.id, direccion: "SALIENTE", autor: "BOT", tipo: "TEXTO", contenido: "¿Para qué?", creadoEn: AHORA } });
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "quiero hablar con una persona"), deps)).toBe("RESPONDIDO");
    expect(leadDe(l.id)).toMatchObject({ estado: "DERIVADO", controlHumano: true });
    expect(deps.avisos).toEqual(["DERIVADO"]);
  });

  it("máximo de respuestas: cierre cálido, DERIVADO, control humano y aviso", async () => {
    const l = lead({ respuestasBot: 6 });
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "otra pregunta"), deps)).toBe("RESPONDIDO");
    expect(deps.enviados).toEqual([MENSAJE_CIERRE_MAXIMO]);
    expect(leadDe(l.id)).toMatchObject({ estado: "DERIVADO", controlHumano: true, respuestasBot: 7 });
    expect(deps.avisos).toEqual(["MAXIMO"]);
  });

  it("audio: respuesta fija y aviso; audio + texto: IA y aviso", async () => {
    const l = lead();
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "", "AUDIO"), deps)).toBe("RESPONDIDO");
    expect(deps.enviados).toEqual([MENSAJE_SIN_AUDIO]);
    expect(deps.avisos).toEqual(["AUDIO"]);
    deps.ia = respuestaIA({});
    await entra(l.id, "", "AUDIO");
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "y además quería info"), deps)).toBe("RESPONDIDO");
    expect(deps.avisos).toEqual(["AUDIO", "AUDIO"]);
  });

  it("JSON inválido, negativa o error de la IA: deriva a Luciano y NO responde", async () => {
    for (const [i, palabra] of ["#invalido", "#negativa", "#error"].entries()) {
      const l = lead({ telefono: `549349000001${i}` });
      expect(await procesarMensajeEntrante(l.id, await entra(l.id, `casa ${palabra}`), deps)).toBe("ERROR_IA");
      expect(leadDe(l.id)).toMatchObject({ estado: "DERIVADO", controlHumano: true, respuestasBot: 0 });
    }
    expect(deps.enviados).toEqual([]);
    expect(deps.avisos).toEqual(["ERROR", "ERROR", "ERROR"]);
    // Las llamadas que se hicieron igual se cobran.
    expect(b.tablas.uso[0].llamadas).toBe(2);
  });

  it("sin clave de la IA: deriva sin responder y el aviso dice \"Falta la clave de la IA\"", async () => {
    const detalles: (string | undefined)[] = [];
    deps.ia = motorSinClave;
    deps.avisar = async (av) => {
      detalles.push(av.detalle);
      return true;
    };
    const l = lead();
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "Hola, info de las casas"), deps)).toBe("ERROR_IA");
    expect(leadDe(l.id)).toMatchObject({ estado: "DERIVADO", controlHumano: true, respuestasBot: 0 });
    expect(deps.enviados).toEqual([]);
    expect(detalles).toEqual(["Falta la clave de la IA (ANTHROPIC_API_KEY en Vercel)."]);
    expect(b.tablas.uso).toEqual([]);
  });

  it("si WhatsApp no acepta el envío: no cuenta la respuesta y avisa", async () => {
    deps.whatsapp.enviarTexto = async () => ({ ok: false, error: "HTTP 400" });
    for (const [i, contenido, tipo] of [[0, "info", "TEXTO"], [1, "", "AUDIO"]] as const) {
      const l = lead({ telefono: `549349000002${i}` });
      expect(await procesarMensajeEntrante(l.id, await entra(l.id, contenido, tipo), deps)).toBe("ERROR_ENVIO");
      expect(leadDe(l.id).respuestasBot).toBe(0);
    }
    const l = lead({ telefono: "5493490000030", respuestasBot: 6 });
    expect(await procesarMensajeEntrante(l.id, await entra(l.id, "x"), deps)).toBe("ERROR_ENVIO");
    b.tablas.uso.push({ mes: "2026-11", costoUsd: 9, avisoOchentaEn: AHORA });
    const l2 = lead({ telefono: "5493490000031" });
    expect(await procesarMensajeEntrante(l2.id, await entra(l2.id, "info"), deps)).toBe("ERROR_ENVIO");
    expect(salientes()).toEqual([]);
    expect(deps.avisos.every((a) => a === "ERROR")).toBe(true);
  });

  it("un mensaje sin id de WhatsApp no se marca como leído; lead inexistente o error de base no rompen", async () => {
    const l = lead();
    const m = await b.db.mensajeWhatsapp.create({ data: { leadId: l.id, direccion: "ENTRANTE", autor: "CLIENTE", tipo: "TEXTO", contenido: "info", creadoEn: AHORA } });
    expect(await procesarMensajeEntrante(l.id, m.waMessageId, deps)).toBe("RESPONDIDO");
    expect(deps.leidos).toEqual([]);
    // Lead borrado mientras tanto.
    expect(await procesarMensajeEntrante("no-existe", "wamid.x", deps)).toBe("SIN_LEAD");
    // Falla de base: se registra sin datos personales.
    deps.esperar = async () => {
      throw new Error("base caída 5493490000001");
    };
    expect(await procesarMensajeEntrante(l.id, "x", deps)).toBe("ERROR_IA");
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain("549349");
  });

  it("dependencias reales: arman sin tocar la red", async () => {
    vi.stubEnv("BOT_IA_SIMULADA", "1");
    vi.stubEnv("WHATSAPP_SIMULADO", "1");
    expect(factorEsperas()).toBe(1);
    vi.stubEnv("E2E_BOT_RAPIDO", "1");
    expect(factorEsperas()).toBe(0.05);
    const d = dependenciasReales();
    expect(d.ia).toBe(motorSimulado);
    expect(d.ahora()).toBeInstanceOf(Date);
    vi.useFakeTimers();
    const p = d.esperar(10);
    vi.advanceTimersByTime(1);
    await p;
    vi.useRealTimers();
    vi.stubEnv("NODE_ENV", "production");
    expect(factorEsperas()).toBe(1);
    vi.unstubAllEnvs();
  });
});

describe("datosNuevos", () => {
  it("solo completa lo vacío, recorta y descarta orígenes inválidos", () => {
    const l = { nombre: "Luciano lo cargó", uso: null, zona: null, terreno: null, personas: null, plazo: null, origen: null, origenDetalle: null } as unknown as LeadWhatsapp;
    expect(datosNuevos(l, { ...VACIOS, nombre: "Otro", zona: " Rafaela ", uso: "  ", plazo: "a".repeat(300), origen: "TV" as never })).toEqual({ zona: "Rafaela", plazo: "a".repeat(200) });
  });
});
