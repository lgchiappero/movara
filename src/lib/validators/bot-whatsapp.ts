import { z } from "zod";
import {
  DIAS,
  ESTADOS_LEAD,
  ETIQUETAS_EXCLUIDO,
  MODOS_RESPALDO,
  ORIGENES,
} from "@/lib/bot-whatsapp/constantes";
import { telefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";

/** Validación de las rutas /api/admin/bot-whatsapp/*. Los esquemas son
 * estrictos: un campo que no existe es un error (el panel no lo manda). */

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const franjaSchema = z
  .object({ desde: z.string().regex(HORA, "Hora inválida (HH:MM)"), hasta: z.string().regex(HORA, "Hora inválida (HH:MM)") })
  .strict()
  .refine((f) => f.desde < f.hasta, { message: "La hora de cierre tiene que ser posterior a la de apertura" });

export const horarioSchema = z
  .object(Object.fromEntries(DIAS.map((d) => [d, z.array(franjaSchema).max(3, "Máximo 3 franjas por día")])) as Record<
    (typeof DIAS)[number],
    z.ZodArray<typeof franjaSchema>
  >)
  .strict();

/** Teléfono escrito como sea → formato de WhatsApp (549…); error si no se
 * puede interpretar. */
const telefonoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el teléfono")
  .max(40)
  .transform((v, ctx) => {
    const t = telefonoWhatsapp(v);
    if (!t) {
      ctx.addIssue({ code: "custom", message: "Teléfono inválido. Ej: 3493 667214 o +54 9 3493 66-7214" });
      return z.NEVER;
    }
    return t;
  });

/** Campos opcionales: si la clave NO viene en el body, queda afuera del
 * resultado (no se toca en la base); si viene null, vacía o solo con
 * espacios, queda null (se borra). El .optional() va por fuera de la
 * transformación: así, una clave ausente ni siquiera se evalúa. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullable()
    .transform((v) => v || null)
    .optional();

export const configPatchSchema = z
  .object({
    activo: z.boolean(),
    modoHorario: z.boolean(),
    horarioAtencion: horarioSchema,
    modoRespaldo: z.enum(MODOS_RESPALDO),
    mensajeBienvenida: z.string().trim().min(1, "El mensaje no puede quedar vacío").max(1000, "Máximo 1000 caracteres"),
    topeGastoMensualUsd: z.number().min(0, "No puede ser negativo").max(1000, "Máximo USD 1000"),
    emailAviso: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .transform((v) => v || null)
      .refine((v) => v === null || z.string().email().safeParse(v).success, { message: "Email inválido" })
      .optional(),
    whatsappAviso: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .transform((v, ctx) => {
        if (!v) return null;
        const t = telefonoWhatsapp(v);
        if (!t) {
          ctx.addIssue({ code: "custom", message: "WhatsApp inválido" });
          return z.NEVER;
        }
        return t;
      })
      .optional(),
    maxRespuestasPorLead: z.number().int("Tiene que ser un número entero").min(1, "Mínimo 1").max(50, "Máximo 50"),
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "No hay cambios" });

export type ConfigPatch = z.infer<typeof configPatchSchema>;

const calificacion = {
  nombre: textoOpcional(120),
  uso: textoOpcional(200),
  zona: textoOpcional(200),
  terreno: textoOpcional(200),
  personas: textoOpcional(200),
  plazo: textoOpcional(200),
  origen: z.enum(ORIGENES).nullable().optional(),
  origenDetalle: textoOpcional(200),
  notas: textoOpcional(5000),
};

/** Fecha del próximo contacto: "YYYY-MM-DD" (día, sin hora) o null. */
const proximoContactoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .nullable()
  .transform((v) => (v ? new Date(`${v}T12:00:00.000Z`) : null));

export const leadCreateSchema = z
  .object({
    telefono: telefonoSchema,
    ...calificacion,
    estado: z.enum(ESTADOS_LEAD).default("NUEVO"),
    proximoContacto: proximoContactoSchema.optional(),
  })
  .strict();

export const leadPatchSchema = z
  .object({
    ...calificacion,
    estado: z.enum(ESTADOS_LEAD),
    controlHumano: z.boolean(),
    proximoContacto: proximoContactoSchema,
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "No hay cambios" });

export const excluidoCreateSchema = z
  .object({ telefono: telefonoSchema, etiqueta: z.enum(ETIQUETAS_EXCLUIDO) })
  .strict();

/** Máximo de teléfonos por importación (una agenda grande entra de sobra). */
export const MAX_IMPORTAR_EXCLUIDOS = 5000;
/** Body de la importación: 5000 renglones de teléfono + nombre. */
export const MAX_BODY_IMPORTAR = 768 * 1024;

/** Importación desde un .vcf: el navegador lee el archivo y manda solo
 * teléfono y nombre de cada contacto; el servidor normaliza y valida. Un
 * teléfono que no se puede interpretar no es un error: se cuenta como
 * salteado. */
export const importarExcluidosSchema = z
  .object({
    contactos: z
      .array(z.object({ telefono: z.string().max(60), nombre: z.string().max(300).nullable() }).strict())
      .min(1, "El archivo no tiene contactos con teléfono")
      .max(MAX_IMPORTAR_EXCLUIDOS, `Máximo ${MAX_IMPORTAR_EXCLUIDOS} teléfonos por importación`),
    confirmar: z.boolean(),
  })
  .strict();

export const leadsQuerySchema = z.object({
  estado: z.enum(ESTADOS_LEAD).optional(),
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
});

export const TAMANO_PAGINA = 50;
