import { z } from "zod";
import { ETAPA_OPTIONS, ORIGEN_OPTIONS } from "@/lib/leads/constantes";

export const leadContactadoSchema = z.object({
  contactado: z.boolean(),
});
export type LeadContactadoInput = z.infer<typeof leadContactadoSchema>;

const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" || v === null ? null : v));
const numberOrNull = z.union([z.number(), z.null()]);

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
