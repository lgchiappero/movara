import { z } from "zod";
import { nombreSchema, razonSocialSchema, telefonoSchema, emailSchema } from "@/lib/validators/configurador";
import { HORARIOS_AGENDA } from "@/lib/agenda/horarios";
import { isFechaKeyValida, hoyFechaKey } from "@/lib/agenda/fecha";

export const tipoClienteAgendaOptions = ["particular", "empresa"] as const;

export const consultaSchema = z
  .string()
  .min(20, "Contanos un poco más — mínimo 20 caracteres")
  .max(1000, "Máximo 1000 caracteres");

export const citaSchema = z
  .object({
    fecha: z.string().refine(isFechaKeyValida, "Fecha inválida").refine(
      (v) => v >= hoyFechaKey(),
      "No se puede agendar en una fecha pasada"
    ),
    horario: z.enum(HORARIOS_AGENDA),
    tipoCliente: z.enum(tipoClienteAgendaOptions),
    nombre: nombreSchema,
    email: emailSchema,
    telefono: telefonoSchema,
    razonSocial: razonSocialSchema.optional(),
    consulta: consultaSchema,
  })
  .refine((data) => data.tipoCliente !== "empresa" || !!data.razonSocial?.trim(), {
    message: "La razón social es obligatoria para clientes tipo empresa",
    path: ["razonSocial"],
  });

export type CitaInput = z.infer<typeof citaSchema>;
