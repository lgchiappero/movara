import { z } from "zod";
import { ETAPA_OPTIONS, ORIGEN_OPTIONS } from "@/lib/leads/constantes";
import { MODELOS_UNIDAD } from "@/lib/envios/constantes";

export const leadContactadoSchema = z.object({
  contactado: z.boolean(),
});
export type LeadContactadoInput = z.infer<typeof leadContactadoSchema>;

const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" || v === null ? null : v));
const numberOrNull = z.union([z.number(), z.null()]);

// Mismos modelos que Unidad.modelo (MODELOS_UNIDAD) más "Varios" — un lead
// manual puede no tener todavía un modelo de unidad real asignado.
export const MODELO_INTERES_OPTIONS = [...MODELOS_UNIDAD, "Varios"] as const;

// Alta manual de un lead desde /admin/pipeline (botón "Nuevo lead") — a
// diferencia del formulario público (src/app/api/leads/route.ts), acá
// "teléfono" no es obligatorio: quien lo carga puede tener solo un email o
// un dato de contacto parcial. Se guarda como "" (no null) porque
// Lead.telefono es NOT NULL en el schema.
export const leadCreateSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  email: stringOrNull,
  telefono: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ?? "").trim()),
  origen: z.union([z.enum(ORIGEN_OPTIONS), z.null()]),
  modeloInteres: z.union([z.enum(MODELO_INTERES_OPTIONS), z.null()]),
  notasVenta: stringOrNull,
  vendedorId: stringOrNull,
  valorEstimado: numberOrNull,
});
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

// Edición desde el panel lateral de /admin/pipeline — todo el lead excepto
// los campos de solo-lectura que vienen del formulario público
// (nombre/teléfono/email/mensaje) y `contactado` (tiene su propio botón
// toggle en /admin/leads).
export const leadPipelineSchema = z
  .object({
    etapa: z.enum(ETAPA_OPTIONS),
    origen: z.union([z.enum(ORIGEN_OPTIONS), z.null()]),
    vendedorId: stringOrNull,
    notasVenta: stringOrNull,
    motivoPerdida: stringOrNull,
    valorEstimado: numberOrNull,
  })
  .refine((data) => data.etapa !== "perdido" || !!data.motivoPerdida, {
    message: "El motivo de pérdida es obligatorio cuando la etapa es 'perdido'",
    path: ["motivoPerdida"],
  });
export type LeadPipelineInput = z.infer<typeof leadPipelineSchema>;

// Edición rápida e inline de la celda "Notas" en la grilla — un campo
// suelto, no pasa por leadPipelineSchema para no obligar a mandar el resto
// del lead en cada guardado al tipear.
export const leadNotasVentaSchema = z.object({
  notasVenta: stringOrNull,
});
export type LeadNotasVentaInput = z.infer<typeof leadNotasVentaSchema>;
