import { z } from "zod";

const fechaDia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha de entrega")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), "Fecha inválida")
  .transform((v) => new Date(`${v}T00:00:00.000Z`));

export const crearReciboSchema = z.object({
  unidadId: z.string().trim().min(1, "Elegí una unidad"),
  fechaEntrega: fechaDia,
  lugarEntrega: z.string().trim().min(3, "Indicá el lugar de entrega").max(300, "Máximo 300 caracteres"),
  observaciones: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});
export type CrearReciboInput = z.infer<typeof crearReciboSchema>;

export const anularReciboSchema = z.object({ accion: z.literal("anular") });

/** Token del link /recibo/[token] — mismo formato que tokenSeguimiento. */
export const tokenReciboSchema = z.string().regex(/^[a-f0-9]{64}$/);

/** La confirmación exige un POST explícito con este body: abrir el link
 * (lo hacen solos los escáneres de correo) nunca confirma nada. */
export const confirmarReciboSchema = z.object({ confirmo: z.literal(true) });
