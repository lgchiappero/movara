import { z } from "zod";
import { telefonoSchema, emailSchema, localidadSchema, notasConfiguracionSchema } from "@/lib/validators/configurador";

// ─── Enums ─────────────────────────────────────────────────
// Reflejan las claves reales del configurador visual
// (src/components/configurador/ConfiguradorMovara.tsx).

export const modeloOptions = ["10ft", "20ft", "40ft"] as const;
export const finalidadOptions = [
  "inversor",
  "agro",
  "vivienda",
  "turismo",
  "empresa",
  "sector-publico",
] as const;
export const tipoCocinaOptions = ["electrico", "gas"] as const;
export const tipoAguaOptions = ["calefon-electrico"] as const;
// Opciones que el configurador ya no ofrece pero que quedaron guardadas en
// pedidos viejos: el admin las conserva al guardar y los PDFs las muestran.
export const tipoAguaDiscontinuadoOptions = ["termotanque-gas"] as const;
export const lavarropasOptions = ["sin", "bano", "cocina", "externo"] as const;
export const tipoClienteOptions = ["particular", "empresa"] as const;

// Nombre a mostrar (particular o razón social) — unión de los caracteres
// permitidos por nombreSchema y razonSocialSchema.
const clienteNombreSchema = z
  .string()
  .min(3, "Mínimo 3 caracteres")
  .max(150, "Máximo 150 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s\-'.,&]+$/,
    "Solo letras, números, espacios y signos básicos"
  );

// ─── Schema ────────────────────────────────────────────────
// Shape canónico de un pedido — coincide con los campos del modelo
// ConfiguracionPedido (Prisma), que es lo que consumen los PDFs y el panel
// admin. El wizard mapea su estado local (nombre/razonSocial/telefono...) a
// este shape antes de enviarlo.

export const pedidoSchema = z.object({
  clienteNombre: clienteNombreSchema,
  clienteWhatsapp: telefonoSchema,
  clienteEmail: emailSchema,

  tipoCliente: z.enum(tipoClienteOptions),
  razonSocial: clienteNombreSchema.optional(),
  nombreContacto: clienteNombreSchema.optional(),

  modelo: z.enum(modeloOptions),
  finalidad: z.enum(finalidadOptions),
  provincia: z.string().min(1, "Elegí una provincia"),
  localidad: localidadSchema,

  habitaciones: z.number().int().min(1).max(3),
  incluyeCocina: z.boolean(),
  tipoCocina: z.enum(tipoCocinaOptions),
  incluyeBano: z.boolean(),
  // El calefón eléctrico es el único sistema de agua caliente. Un cliente con
  // la versión anterior de la página abierta puede mandar termotanque-gas:
  // se registra la consulta con el calefón en vez de rechazarla.
  tipoAgua: z.preprocess(
    (v) => (v === undefined || (tipoAguaDiscontinuadoOptions as readonly unknown[]).includes(v) ? "calefon-electrico" : v),
    z.enum(tipoAguaOptions)
  ),
  lavarropas: z.enum(lavarropasOptions),

  materiales: z.record(z.string(), z.string().nullable()),
  // El configurador ya no ofrece mejoras: queda para pedidos de clientes con
  // la versión anterior de la página abierta.
  upgrades: z.array(z.string()).default([]),
  notasConfiguracion: notasConfiguracionSchema.nullish().transform((v) => v ?? null),

  precioEstimado: z.number().nonnegative().optional(),
});

export type PedidoInput = z.infer<typeof pedidoSchema>;
export type TipoAguaDiscontinuado = (typeof tipoAguaDiscontinuadoOptions)[number];
