import { z } from "zod";
import { HORARIOS_AGENDA } from "@/lib/agenda/horarios";
import { isFechaKeyValida } from "@/lib/agenda/fecha";

export const disponibilidadDiaSchema = z.object({
  fecha: z.string().refine(isFechaKeyValida, "Fecha inválida"),
  habilitada: z.boolean(),
  horarios: z.array(z.enum(HORARIOS_AGENDA)),
});

export const habilitarMesSchema = z.object({
  anio: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
});

export const citaAdminActionSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("cancelar"), motivo: z.string().max(500).optional() }),
  z.object({ accion: z.literal("completar") }),
]);
