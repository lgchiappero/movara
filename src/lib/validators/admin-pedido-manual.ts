import { z } from "zod";
import { nombreSchema, telefonoSchema } from "@/lib/validators/configurador";
import { modeloOptions, finalidadOptions, tipoClienteOptions } from "@/lib/validators/pedido";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined));

const emailOptional = z
  .union([z.string().max(254).email("Email inválido"), z.literal("")])
  .optional();

export const nuevoPedidoManualSchema = z
  .object({
    clienteNombre: nombreSchema,
    tipoCliente: z.enum(tipoClienteOptions),
    razonSocial: optionalTrimmed(150),
    clienteEmail: emailOptional,
    clienteWhatsapp: telefonoSchema,
    provincia: optionalTrimmed(100),
    modelo: z.enum(modeloOptions).optional(),
    finalidad: z.enum(finalidadOptions).optional(),
    vendedorAsignado: optionalTrimmed(254),
    notasInternas: optionalTrimmed(2000),
  })
  .refine((data) => data.tipoCliente !== "empresa" || !!data.razonSocial, {
    message: "La razón social es obligatoria para clientes tipo empresa",
    path: ["razonSocial"],
  });

export type NuevoPedidoManualInput = z.infer<typeof nuevoPedidoManualSchema>;
