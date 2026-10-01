import { z } from "zod";
import {
  TIPO_ACUERDO_OPTIONS,
  CONCEPTO_COBRO_OPTIONS,
  CONCEPTO_PAGO_OPTIONS,
  MONEDA_OPTIONS,
  MODALIDAD_OPTIONS,
  CONCEPTO_LOGISTICA_OPTIONS,
  ESTADO_COSTO_OPTIONS,
} from "@/lib/cobranza/constantes";

const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" || v === null ? null : v));

// Tolerancia entre la suma de cuotas y el total acordado — misma que usa
// src/lib/cobranza/calc.ts para no duplicar el número mágico.
const EPSILON = 0.01;

const cuotaInputSchema = z.object({
  descripcion: z.string().trim().min(1, "La cuota necesita una descripción"),
  importe: z.number().positive("El importe de la cuota debe ser mayor a 0"),
  vencimiento: z.union([z.string(), z.null()]).optional(),
});

export const crearAcuerdoSchema = z
  .object({
    tipo: z.enum(TIPO_ACUERDO_OPTIONS),
    unidadId: z.string().min(1, "Falta la unidad"),
    concepto: z.string().min(1, "Falta el concepto"),
    descripcion: stringOrNull.optional(),
    contraparte: z.string().trim().min(1, "Falta la contraparte"),
    moneda: z.enum(MONEDA_OPTIONS),
    totalAcordado: z.number().positive("El total acordado debe ser mayor a 0"),
    notas: stringOrNull.optional(),
    cuotas: z.array(cuotaInputSchema).min(1, "Agregá al menos una cuota"),
  })
  .superRefine((data, ctx) => {
    const conceptosValidos: readonly string[] =
      data.tipo === "cobro" ? CONCEPTO_COBRO_OPTIONS : CONCEPTO_PAGO_OPTIONS;
    if (!conceptosValidos.includes(data.concepto)) {
      ctx.addIssue({
        code: "custom",
        path: ["concepto"],
        message: `Concepto inválido para tipo "${data.tipo}"`,
      });
    }
    const sumaCuotas = data.cuotas.reduce((acc, c) => acc + c.importe, 0);
    if (Math.abs(sumaCuotas - data.totalAcordado) > EPSILON) {
      ctx.addIssue({
        code: "custom",
        path: ["cuotas"],
        message: `La suma de las cuotas (${sumaCuotas}) debe coincidir con el total acordado (${data.totalAcordado})`,
      });
    }
  });
export type CrearAcuerdoInput = z.infer<typeof crearAcuerdoSchema>;

/** Edición de un plan de pago existente: total, descripción y la lista
 * completa de cuotas como debe quedar. Las cuotas con `id` son existentes
 * (se actualizan); sin `id`, nuevas; las existentes que no vienen se
 * eliminan (la API rechaza eliminar las que tienen pagos aplicados). */
export const editarPlanSchema = z
  .object({
    totalAcordado: z.number().positive("El total acordado debe ser mayor a 0"),
    descripcion: stringOrNull.optional(),
    cuotas: z
      .array(
        cuotaInputSchema.extend({
          id: z.string().min(1).optional(),
        })
      )
      .min(1, "El plan necesita al menos una cuota"),
  })
  .superRefine((data, ctx) => {
    const sumaCuotas = data.cuotas.reduce((acc, c) => acc + c.importe, 0);
    if (Math.abs(sumaCuotas - data.totalAcordado) > EPSILON) {
      ctx.addIssue({
        code: "custom",
        path: ["cuotas"],
        message: `La suma de las cuotas (${sumaCuotas}) debe coincidir con el total acordado (${data.totalAcordado})`,
      });
    }
  });
export type EditarPlanInput = z.infer<typeof editarPlanSchema>;

/** Costo de logística internacional (por envío) — alta y edición. Llega
 * como multipart (por el comprobante), así que los números y booleanos
 * vienen como string y se coercionan acá. */
export const costoLogisticaSchema = z.object({
  concepto: z.enum(CONCEPTO_LOGISTICA_OPTIONS, { message: "Concepto inválido" }),
  descripcion: stringOrNull.optional(),
  moneda: z.enum(MONEDA_OPTIONS),
  importe: z.coerce.number().positive("El importe debe ser mayor a 0"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Falta la fecha del pago"),
  estado: z.enum(ESTADO_COSTO_OPTIONS),
  notas: stringOrNull.optional(),
  prorratear: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});
export type CostoLogisticaInput = z.infer<typeof costoLogisticaSchema>;

export const registrarMovimientoSchema = z.object({
  fecha: z.string().min(1, "Falta la fecha"),
  importe: z.number().positive("El importe debe ser mayor a 0"),
  cuotaId: stringOrNull.optional(),
  modalidad: z.enum(MODALIDAD_OPTIONS),
  notas: stringOrNull.optional(),
});
export type RegistrarMovimientoInput = z.infer<typeof registrarMovimientoSchema>;

const FUENTE_TIPO_CAMBIO_OPTIONS = ["oficial", "blue", "manual"] as const;

export const cargarTipoCambioSchema = z.object({
  fecha: z.string().min(1, "Falta la fecha"),
  usdArs: z.number().positive("La cotización debe ser mayor a 0"),
  fuente: z.union([z.enum(FUENTE_TIPO_CAMBIO_OPTIONS), z.null()]).optional(),
});
export type CargarTipoCambioInput = z.infer<typeof cargarTipoCambioSchema>;

export const cerrarPeriodoSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2020).max(2100),
  notas: stringOrNull.optional(),
});
export type CerrarPeriodoInput = z.infer<typeof cerrarPeriodoSchema>;
