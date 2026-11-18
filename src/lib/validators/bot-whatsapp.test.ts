import { describe, it, expect } from "vitest";
import {
  configPatchSchema,
  excluidoCreateSchema,
  horarioSchema,
  leadCreateSchema,
  leadPatchSchema,
  leadsQuerySchema,
} from "./bot-whatsapp";
import { HORARIO_POR_DEFECTO } from "@/lib/bot-whatsapp/constantes";

const error = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? null : r.error!.issues[0].message);

describe("configPatchSchema", () => {
  it("acepta cambios parciales (ej. solo el interruptor)", () => {
    expect(configPatchSchema.parse({ activo: true })).toEqual({ activo: true });
  });

  it("normaliza el WhatsApp de aviso y vacía los opcionales", () => {
    expect(configPatchSchema.parse({ whatsappAviso: "3493 667214", emailAviso: "" })).toEqual({
      whatsappAviso: "5493493667214",
      emailAviso: null,
    });
    expect(configPatchSchema.parse({ whatsappAviso: "" })).toEqual({ whatsappAviso: null });
  });

  it.each([
    [{}, "No hay cambios"],
    [{ topeGastoMensualUsd: -1 }, "No puede ser negativo"],
    [{ topeGastoMensualUsd: 5000 }, "Máximo USD 1000"],
    [{ maxRespuestasPorLead: 0 }, "Mínimo 1"],
    [{ maxRespuestasPorLead: 2.5 }, "Tiene que ser un número entero"],
    [{ mensajeBienvenida: "   " }, "El mensaje no puede quedar vacío"],
    [{ emailAviso: "no-es-email" }, "Email inválido"],
    [{ whatsappAviso: "12" }, "WhatsApp inválido"],
  ])("rechaza %j: %s", (datos, mensaje) => {
    expect(error(configPatchSchema.safeParse(datos))).toBe(mensaje);
  });

  it("es estricto: un campo que no existe es un error", () => {
    expect(configPatchSchema.safeParse({ activo: true, otro: 1 }).success).toBe(false);
    expect(configPatchSchema.safeParse({ modoRespaldo: "OTRO" }).success).toBe(false);
  });
});

describe("horarioSchema", () => {
  it("acepta el horario por defecto", () => {
    expect(horarioSchema.parse(HORARIO_POR_DEFECTO)).toEqual(HORARIO_POR_DEFECTO);
  });

  it("rechaza horas mal escritas, cierre antes de la apertura, más de 3 franjas o días faltantes", () => {
    expect(error(horarioSchema.safeParse({ ...HORARIO_POR_DEFECTO, lun: [{ desde: "8:00", hasta: "18:00" }] }))).toBe("Hora inválida (HH:MM)");
    expect(error(horarioSchema.safeParse({ ...HORARIO_POR_DEFECTO, lun: [{ desde: "18:00", hasta: "08:00" }] }))).toBe(
      "La hora de cierre tiene que ser posterior a la de apertura"
    );
    const f = { desde: "08:00", hasta: "09:00" };
    expect(error(horarioSchema.safeParse({ ...HORARIO_POR_DEFECTO, lun: [f, f, f, f] }))).toBe("Máximo 3 franjas por día");
    const sinDomingo: Partial<typeof HORARIO_POR_DEFECTO> = { ...HORARIO_POR_DEFECTO };
    delete sinDomingo.dom;
    expect(horarioSchema.safeParse(sinDomingo).success).toBe(false);
  });
});

describe("leadCreateSchema / leadPatchSchema", () => {
  it("alta: teléfono normalizado, estado NUEVO por defecto y vacíos como null", () => {
    expect(leadCreateSchema.parse({ telefono: "+54 9 3493 66-7214", nombre: " Ana ", zona: "", origen: "WEB" })).toStrictEqual({
      telefono: "5493493667214",
      nombre: "Ana",
      zona: null,
      origen: "WEB",
      estado: "NUEVO",
    });
  });

  it("alta: teléfono vacío o inválido", () => {
    expect(error(leadCreateSchema.safeParse({ telefono: "" }))).toBe("Ingresá el teléfono");
    expect(error(leadCreateSchema.safeParse({ telefono: "123" }))).toMatch(/Teléfono inválido/);
    expect(leadCreateSchema.safeParse({ telefono: "3493667214", estado: "INVENTADO" }).success).toBe(false);
  });

  it("edición: próximo contacto como día (mediodía UTC, sin corrimiento de zona) o null; control humano", () => {
    const r = leadPatchSchema.parse({ proximoContacto: "2026-12-01", controlHumano: true, origen: null });
    expect(r.proximoContacto!.toISOString()).toBe("2026-12-01T12:00:00.000Z");
    expect(r).toMatchObject({ controlHumano: true, origen: null });
    expect(leadPatchSchema.parse({ proximoContacto: null })).toEqual({ proximoContacto: null });
    expect(leadPatchSchema.safeParse({ proximoContacto: "1/12/2026" }).success).toBe(false);
  });

  it("edición: sin cambios, campos desconocidos o textos largos", () => {
    expect(error(leadPatchSchema.safeParse({}))).toBe("No hay cambios");
    expect(leadPatchSchema.safeParse({ telefono: "3493667214" }).success).toBe(false);
    expect(error(leadPatchSchema.safeParse({ zona: "x".repeat(201) }))).toBe("Máximo 200 caracteres");
  });
});

describe("campos opcionales: lo que no viene no se toca; null o vacío borra", () => {
  const TEXTOS = ["nombre", "uso", "zona", "terreno", "personas", "plazo", "origenDetalle", "notas"] as const;

  it("PATCH con un solo campo: el resultado tiene solo ese campo (nada más se pisa)", () => {
    expect(leadPatchSchema.parse({ controlHumano: true })).toStrictEqual({ controlHumano: true });
    expect(leadPatchSchema.parse({ estado: "VISITA" })).toStrictEqual({ estado: "VISITA" });
    expect(leadPatchSchema.parse({ zona: "Rafaela" })).toStrictEqual({ zona: "Rafaela" });
  });

  it.each(TEXTOS)("PATCH: %s en null, vacío o con espacios queda null (se borra)", (campo) => {
    for (const valor of [null, "", "   "]) {
      expect(leadPatchSchema.parse({ [campo]: valor })).toStrictEqual({ [campo]: null });
    }
  });

  it("PATCH: origen null borra; ausente no aparece", () => {
    expect(leadPatchSchema.parse({ origen: null })).toStrictEqual({ origen: null });
    expect("origen" in leadPatchSchema.parse({ notas: "x" })).toBe(false);
  });

  it("alta: no agrega claves que no vinieron", () => {
    expect(leadCreateSchema.parse({ telefono: "3493667214" })).toStrictEqual({ telefono: "5493493667214", estado: "NUEVO" });
  });

  it("configuración: email y WhatsApp de aviso ausentes no se tocan; null o vacío borran", () => {
    expect(configPatchSchema.parse({ activo: false })).toStrictEqual({ activo: false });
    expect(configPatchSchema.parse({ emailAviso: null, whatsappAviso: "" })).toStrictEqual({ emailAviso: null, whatsappAviso: null });
    expect(configPatchSchema.parse({ emailAviso: " aviso@movara.com.ar " })).toStrictEqual({ emailAviso: "aviso@movara.com.ar" });
  });
});

describe("excluidoCreateSchema y leadsQuerySchema", () => {
  it("excluido: teléfono normalizado y etiqueta válida", () => {
    expect(excluidoCreateSchema.parse({ telefono: "3493 667214", etiqueta: "FAMILIA" })).toEqual({ telefono: "5493493667214", etiqueta: "FAMILIA" });
    expect(excluidoCreateSchema.safeParse({ telefono: "3493 667214", etiqueta: "VECINO" }).success).toBe(false);
  });

  it("filtros: página por defecto 1, estado válido", () => {
    expect(leadsQuerySchema.parse({})).toEqual({ pagina: 1 });
    expect(leadsQuerySchema.parse({ estado: "VISITA", q: " ana ", pagina: "3" })).toEqual({ estado: "VISITA", q: "ana", pagina: 3 });
    expect(leadsQuerySchema.safeParse({ estado: "X" }).success).toBe(false);
  });
});
