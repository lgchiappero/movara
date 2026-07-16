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
export const lavarropaUbicacionOptions = ["bano", "cocina", "espacio_externo"] as const;
export const energiaSolarOptions = ["sin", "preinstalacion", "kit_incluido"] as const;
export const calefonOptions = ["sin", "electrico"] as const;
export const galeriaOptions = ["sin", "balcon_techo", "galeria_perimetral"] as const;

export const paredInteriorColorOptions = [
  "blanco",
  "gris_claro",
  "beige",
  "madera_clara",
  "madera_oscura",
  "personalizado",
] as const;
export const paredInteriorRevestimientoOptions = [
  "pintura_lisa",
  "panel_madera",
  "panel_pvc",
  "otro",
] as const;
export const paredExteriorColorOptions = [
  "blanco",
  "gris",
  "beige",
  "arena",
  "negro_mate",
  "personalizado",
] as const;
export const paredExteriorRevestimientoOptions = [
  "chapa_prepintada",
  "madera_tratada",
  "simil_madera",
  "otro",
] as const;
export const banoRevestimientoOptions = [
  "ceramico_blanco",
  "ceramico_gris",
  "marmol_sintetico",
  "madera_pvc",
  "otro",
] as const;
export const banoColorSanitariosOptions = ["blanco", "negro", "cromo"] as const;
export const cocinaRevestimientoOptions = [
  "ceramico_blanco",
  "ceramico_gris",
  "acero_inoxidable",
  "otro",
] as const;
export const cocinaColorMueblesOptions = [
  "blanco",
  "gris",
  "madera_clara",
  "madera_oscura",
] as const;

export const puertaPrincipalTipoOptions = [
  "placa_simple",
  "placa_vidrio_lateral",
  "doble_hoja",
  "corrediza",
] as const;
export const puertaPrincipalMaterialOptions = ["acero_pintado", "aluminio", "pvc"] as const;
export const puertaPrincipalColorOptions = [
  "blanco",
  "negro",
  "gris",
  "igual_exterior",
] as const;
export const puertaInteriorTipoOptions = ["placa", "corrediza", "sin_puerta"] as const;
export const puertaInteriorColorOptions = [
  "igual_paredes",
  "blanco",
  "natural_madera",
] as const;
export const ventanaTipoOptions = ["tipo_a", "tipo_b", "tipo_c"] as const;

// ─── Schema ────────────────────────────────────────────────

const baseSchema = z.object({
  // Registro pendiente creado desde /admin/configuraciones al que este envío corresponde
  configId: z.string().min(1),

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
  lavarropaIncluye: z.boolean().default(false),
  lavarropaUbicacion: z.enum(lavarropaUbicacionOptions).optional(),
  energiaSolar: z.enum(energiaSolarOptions),
  calefon: z.enum(calefonOptions),

  // Exterior
  galeria: z.enum(galeriaOptions),

  // Mejoras térmicas
  mejoraParedes100: z.boolean().default(false),
  mejoraTripleVidrio: z.boolean().default(false),
  mejoraTechoSandwich: z.boolean().default(false),

  // Acabados y diseño — paredes interiores
  paredInteriorColor: z.enum(paredInteriorColorOptions),
  paredInteriorRevestimiento: z.enum(paredInteriorRevestimientoOptions),

  // Acabados y diseño — paredes exteriores
  paredExteriorColor: z.enum(paredExteriorColorOptions),
  paredExteriorRevestimiento: z.enum(paredExteriorRevestimientoOptions),

  // Acabados y diseño — baño
  banoRevestimiento: z.enum(banoRevestimientoOptions),
  banoColorSanitarios: z.enum(banoColorSanitariosOptions),

  // Acabados y diseño — cocina
  cocinaRevestimiento: z.enum(cocinaRevestimientoOptions),
  cocinaColorMuebles: z.enum(cocinaColorMueblesOptions),

  // Puertas y aberturas — puerta principal
  puertaPrincipalTipo: z.enum(puertaPrincipalTipoOptions),
  puertaPrincipalMaterial: z.enum(puertaPrincipalMaterialOptions),
  puertaPrincipalColor: z.enum(puertaPrincipalColorOptions),

  // Puertas y aberturas — puerta interior
  puertaInteriorTipo: z.enum(puertaInteriorTipoOptions),
  puertaInteriorColor: z.enum(puertaInteriorColorOptions),

  // Puertas y aberturas — ventanas
  ventanaTipo: z.enum(ventanaTipoOptions),
});

export const pedidoSchema = baseSchema.refine(
  (data) => !data.lavarropaIncluye || Boolean(data.lavarropaUbicacion),
  {
    message: "Elegí dónde va el lavarropas",
    path: ["lavarropaUbicacion"],
  }
);

export type PedidoInput = z.infer<typeof baseSchema>;
