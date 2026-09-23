import { z } from "zod";
import { estadoFabricacionOptions, MODELOS_UNIDAD } from "@/lib/envios/constantes";

const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" || v === null ? null : v));
const numberOrNull = z.union([z.number(), z.null()]);
const dateOrNull = z.union([z.string(), z.null()]).transform((v) => (v ? new Date(v) : null));

// Creación rápida desde /admin/unidades — mismo criterio que "Nuevo pedido
// manual" en el sistema de pedidos: lo mínimo para crear el registro y
// seguir completando el resto desde el detalle.
export const nuevaUnidadSchema = z.object({
  clienteId: z.string().min(1, "Elegí un cliente"),
  envioId: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v : undefined)),
  modelo: z.enum(MODELOS_UNIDAD).optional(),
  precioCliente: z.number().nonnegative().optional(),
  notas: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v?.trim() ? v : undefined)),
});
export type NuevaUnidadInput = z.infer<typeof nuevaUnidadSchema>;

// Edición completa desde el detalle de la unidad.
export const unidadEditSchema = z.object({
  clienteId: z.string().min(1, "Elegí un cliente"),
  envioId: stringOrNull,

  modelo: stringOrNull,
  configuracion: z.record(z.string(), z.unknown()).nullable(),
  precioCliente: numberOrNull,

  estadoFabricacion: z.enum(estadoFabricacionOptions),

  provinciaDestino: stringOrNull,
  localidadDestino: stringOrNull,
  direccionEntrega: stringOrNull,
  costoTransporteNacional: numberOrNull,
  costoGrua: numberOrNull,
  fechaEntregaEstimada: dateOrNull,
  fechaEntrega: dateOrNull,

  garantiaActivada: z.boolean(),
  garantiaInicio: dateOrNull,

  notas: stringOrNull,
});
export type UnidadEditInput = z.infer<typeof unidadEditSchema>;
