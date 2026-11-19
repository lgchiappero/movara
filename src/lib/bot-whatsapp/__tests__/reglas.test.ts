import { describe, it, expect } from "vitest";
import { decidir, demoraObjetivo, demoraRestante, type EntradaDecision } from "../reglas";
import { dentroDeHorario } from "../horario";
import { pasaFiltroPalabras, normalizarTexto } from "../palabras-clave";
import { HORARIO_POR_DEFECTO, type HorarioAtencion } from "../constantes";

// Jueves 19/11/2026 a las 22:00 en Córdoba (01:00 UTC del viernes).
const NOCHE = new Date("2026-11-20T01:00:00Z");
// Jueves 19/11/2026 a las 10:00 en Córdoba.
const MANANA = new Date("2026-11-19T13:00:00Z");

function entrada(cambios: Partial<{ [K in keyof EntradaDecision]: Partial<EntradaDecision[K]> }> = {}): EntradaDecision {
  const base: EntradaDecision = {
    config: { activo: true, modoHorario: false, horarioAtencion: HORARIO_POR_DEFECTO, modoRespaldo: "MENSAJE_BIENVENIDA", maxRespuestasPorLead: 6 },
    porcentajeGasto: 0.1,
    excluido: false,
    lead: { estado: "NUEVO", controlHumano: false, respuestasBot: 0, bienvenidaEnviadaEn: null, ultimoEntranteEn: new Date(NOCHE.getTime() - 60_000), esNuevo: true },
    pendientes: [{ tipo: "TEXTO", contenido: "Hola, quería info de las casas" }],
    primerMensaje: "Hola, quería info de las casas",
    ahora: NOCHE,
  };
  return {
    ...base,
    ...(cambios as Partial<EntradaDecision>),
    config: { ...base.config, ...cambios.config },
    lead: { ...base.lead, ...cambios.lead },
  };
}

describe("decidir: cuándo responde el bot", () => {
  it("con todo en regla, responde con la IA", () => {
    expect(decidir(entrada())).toEqual({ tipo: "IA", conAudio: false });
  });

  it("sin mensajes pendientes no hace nada", () => {
    expect(decidir(entrada({ pendientes: [] }))).toEqual({ tipo: "NADA", motivo: "SIN_PENDIENTES" });
  });

  it("1. pausado a mano: no responde nada (ni bienvenida)", () => {
    expect(decidir(entrada({ config: { activo: false } }))).toEqual({ tipo: "NADA", motivo: "PAUSADO" });
    expect(decidir(entrada({ config: { activo: false }, porcentajeGasto: 2 }))).toEqual({ tipo: "NADA", motivo: "PAUSADO" });
  });

  it("1. modo horario: solo responde fuera del horario de atención", () => {
    expect(decidir(entrada({ config: { modoHorario: true }, ahora: MANANA }))).toEqual({ tipo: "NADA", motivo: "EN_HORARIO" });
    expect(decidir(entrada({ config: { modoHorario: true } }))).toEqual({ tipo: "IA", conAudio: false });
    expect(decidir(entrada({ ahora: MANANA, lead: { ultimoEntranteEn: MANANA } }))).toEqual({ tipo: "IA", conAudio: false });
  });

  it("2. contacto excluido: no responde", () => {
    expect(decidir(entrada({ excluido: true }))).toEqual({ tipo: "NADA", motivo: "EXCLUIDO" });
  });

  it("3. control humano: no responde", () => {
    expect(decidir(entrada({ lead: { controlHumano: true } }))).toEqual({ tipo: "NADA", motivo: "CONTROL_HUMANO" });
  });

  it("descartado (no era un posible cliente): no responde más", () => {
    expect(decidir(entrada({ lead: { estado: "DESCARTADO" } }))).toEqual({ tipo: "NADA", motivo: "DESCARTADO" });
  });

  it("4. al llegar al máximo de respuestas: mensaje de cierre", () => {
    expect(decidir(entrada({ lead: { respuestasBot: 5 } }))).toEqual({ tipo: "IA", conAudio: false });
    expect(decidir(entrada({ lead: { respuestasBot: 6 } }))).toEqual({ tipo: "MAXIMO" });
  });

  it("5. solo dentro de la ventana de 24 h; nunca inicia conversaciones", () => {
    expect(decidir(entrada({ lead: { ultimoEntranteEn: null } }))).toEqual({ tipo: "NADA", motivo: "FUERA_DE_VENTANA" });
    expect(decidir(entrada({ lead: { ultimoEntranteEn: new Date(NOCHE.getTime() - 24 * 3600_000) } }))).toEqual({ tipo: "NADA", motivo: "FUERA_DE_VENTANA" });
    expect(decidir(entrada({ lead: { ultimoEntranteEn: new Date(NOCHE.getTime() - 24 * 3600_000 + 1000) } }))).toEqual({ tipo: "IA", conAudio: false });
  });

  it("6. tope de gasto: bienvenida una sola vez a números nuevos que pasan el filtro", () => {
    expect(decidir(entrada({ porcentajeGasto: 1 }))).toEqual({ tipo: "BIENVENIDA" });
    expect(decidir(entrada({ porcentajeGasto: 0.99 }))).toEqual({ tipo: "IA", conAudio: false });
    const sinSaldo = { tipo: "NADA", motivo: "SIN_SALDO" };
    expect(decidir(entrada({ porcentajeGasto: 1, config: { modoRespaldo: "NINGUNO" } }))).toEqual(sinSaldo);
    expect(decidir(entrada({ porcentajeGasto: 1, lead: { esNuevo: false } }))).toEqual(sinSaldo);
    expect(decidir(entrada({ porcentajeGasto: 1, lead: { bienvenidaEnviadaEn: NOCHE } }))).toEqual(sinSaldo);
    expect(decidir(entrada({ porcentajeGasto: 1, primerMensaje: "Che, ¿venís el sábado al asado?" }))).toEqual(sinSaldo);
    expect(decidir(entrada({ porcentajeGasto: 1, primerMensaje: null }))).toEqual(sinSaldo);
  });

  it("audio u otro sin texto: respuesta fija; con texto: IA y aviso de audio", () => {
    expect(decidir(entrada({ pendientes: [{ tipo: "AUDIO", contenido: "" }] }))).toEqual({ tipo: "AUDIO" });
    expect(decidir(entrada({ pendientes: [{ tipo: "OTRO", contenido: "" }, { tipo: "TEXTO", contenido: "  " }] }))).toEqual({ tipo: "AUDIO" });
    expect(decidir(entrada({ pendientes: [{ tipo: "AUDIO", contenido: "" }, { tipo: "TEXTO", contenido: "y esto" }] }))).toEqual({ tipo: "IA", conAudio: true });
  });
});

describe("demora humana", () => {
  it("de 5 a 20 s según el largo", () => {
    expect(demoraObjetivo("Hola")).toBe(5_000);
    expect(demoraObjetivo("a".repeat(150))).toBe(9_000);
    expect(demoraObjetivo("a".repeat(1000))).toBe(20_000);
  });
  it("descuenta lo que ya tardó la IA y nunca es negativa", () => {
    expect(demoraRestante("Hola", 2_000)).toBe(3_000);
    expect(demoraRestante("a".repeat(1000), 25_000)).toBe(0);
  });
});

describe("horario de atención", () => {
  const horario: HorarioAtencion = { lun: [], mar: [], mie: [], jue: [{ desde: "09:00", hasta: "12:00" }], vie: [], sab: [], dom: [] };
  it("incluye la apertura y excluye el cierre (hora de Córdoba)", () => {
    expect(dentroDeHorario(horario, new Date("2026-11-19T12:00:00Z"))).toBe(true); // 09:00
    expect(dentroDeHorario(horario, new Date("2026-11-19T14:59:00Z"))).toBe(true); // 11:59
    expect(dentroDeHorario(horario, new Date("2026-11-19T15:00:00Z"))).toBe(false); // 12:00
    expect(dentroDeHorario(horario, new Date("2026-11-19T11:59:00Z"))).toBe(false); // 08:59
    expect(dentroDeHorario(horario, new Date("2026-11-20T13:00:00Z"))).toBe(false); // viernes
  });
  it("un día sin franjas (o que falta) es sin atención", () => {
    expect(dentroDeHorario({} as HorarioAtencion, MANANA)).toBe(false);
  });
});

describe("filtro de palabras sin IA", () => {
  it("normaliza mayúsculas y tildes", () => {
    expect(normalizarTexto("Cotización ÑANDÚ")).toBe("cotizacion nandu");
  });
  it.each([
    "Hola, quería información",
    "PRECIO?",
    "vi el cartel en la ruta",
    "me interesa una casa",
    "¿Hacen casas modulares?",
    "Cotizacion por favor",
    "busco algo prefabricada",
    "Hola MOVARA, quiero consultar por el modelo",
    "  hola movara",
    "un contenedor",
    "pasé por el showroom",
    "info",
  ])("pasa: %s", (t) => expect(pasaFiltroPalabras(t)).toBe(true));
  it.each(["Hola", "¿Venís al asado?", "casamiento el sábado", "informe listo", "hola"])("no pasa: %s", (t) => expect(pasaFiltroPalabras(t)).toBe(false));
});
