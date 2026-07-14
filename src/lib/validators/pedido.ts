import { z } from "zod";
import { nombreSchema, telefonoSchema, emailSchema } from "@/lib/validators/configurador";

// ─── Enums ─────────────────────────────────────────────────

export const modeloOptions = ["10ft", "20ft", "40ft"] as const;
export const zonaClimaticaOptions = [
  "templada",
  "frio_intenso",
  "calor_extremo",
  "humedad_alta",
] as const;
export const banoInodoroOptions = ["estandar", "inteligente_bidet"] as const;
export const banoEspejoOptions = ["comun", "inteligente_led"] as const;
export const banoDuchaOptions = ["estandar_esquinero", "premium"] as const;
export const cocinaTipoOptions = ["vitroceramica", "espacio_gas"] as const;
export const lavarropasOptions = ["sin_preinstalacion", "con_preinstalacion"] as const;
export const energiaSolarOptions = ["sin", "preinstalacion", "kit_incluido"] as const;
export const calefonOptions = ["sin", "electrico"] as const;
export const galeriaOptions = ["sin", "balcon_techo", "galeria_perimetral"] as const;

// ─── Schema ────────────────────────────────────────────────

export const pedidoSchema = z.object({
  // Contacto
  leadId: z.string().cuid().optional(),
  clienteNombre: nombreSchema,
  clienteWhatsapp: telefonoSchema,
  clienteEmail: emailSchema.optional().or(z.literal("")),

  // Producto
  modelo: z.enum(modeloOptions),
  zonaClimatica: z.enum(zonaClimaticaOptions),

  // Baño
  banoInodoro: z.enum(banoInodoroOptions),
  banoEspejo: z.enum(banoEspejoOptions),
  banoDucha: z.enum(banoDuchaOptions),

  // Cocina
  cocinaTipo: z.enum(cocinaTipoOptions),
  cocinaExtractor: z.boolean().default(false),
  cocinaAlacena: z.boolean().default(false),
  cocinaVentana: z.boolean().default(false),

  // Aberturas
  aberturaRejas: z.boolean().default(false),
  aberturaMosquitero: z.boolean().default(false),
  aberturaCortinas: z.boolean().default(false),

  // Lavarropas, energía, confort
  lavarropas: z.enum(lavarropasOptions),
  energiaSolar: z.enum(energiaSolarOptions),
  calefon: z.enum(calefonOptions),

  // Exterior
  galeria: z.enum(galeriaOptions),

  // Mejoras térmicas
  mejoraParedes100: z.boolean().default(false),
  mejoraTripleVidrio: z.boolean().default(false),
  mejoraTechoSandwich: z.boolean().default(false),
});

export type PedidoInput = z.infer<typeof pedidoSchema>;
