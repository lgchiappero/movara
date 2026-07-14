import type { PedidoInput } from "@/lib/validators/pedido";

// Etiquetas en español — compartidas entre el formulario UI y el PDF/comprobante del cliente.

export const modeloLabelsEs: Record<PedidoInput["modelo"], string> = {
  "10ft": "10ft (18m²)",
  "20ft": "20ft (37m²)",
  "40ft": "40ft (74m²)",
};

export const zonaClimaticaLabelsEs: Record<PedidoInput["zonaClimatica"], string> = {
  templada: "Templada",
  frio_intenso: "Frío intenso",
  calor_extremo: "Calor extremo",
  humedad_alta: "Humedad alta",
};

export const banoInodoroLabelsEs: Record<PedidoInput["banoInodoro"], string> = {
  estandar: "Estándar",
  inteligente_bidet: "Inteligente con bidet",
};

export const banoEspejoLabelsEs: Record<PedidoInput["banoEspejo"], string> = {
  comun: "Común",
  inteligente_led: "Inteligente con LED",
};

export const banoDuchaLabelsEs: Record<PedidoInput["banoDucha"], string> = {
  estandar_esquinero: "Estándar esquinero",
  premium: "Premium",
};

export const cocinaTipoLabelsEs: Record<PedidoInput["cocinaTipo"], string> = {
  vitroceramica: "Vitrocerámica",
  espacio_gas: "Espacio para garrafa/gas",
};

export const lavarropaUbicacionLabelsEs: Record<
  NonNullable<PedidoInput["lavarropaUbicacion"]>,
  string
> = {
  bano: "Baño",
  cocina: "Cocina",
  espacio_externo: "Espacio externo",
};

export const energiaSolarLabelsEs: Record<PedidoInput["energiaSolar"], string> = {
  sin: "Sin energía solar",
  preinstalacion: "Solo preinstalación",
  kit_incluido: "Kit incluido",
};

export const calefonLabelsEs: Record<PedidoInput["calefon"], string> = {
  sin: "Sin calefón",
  electrico: "Calefón eléctrico",
};

export const galeriaLabelsEs: Record<PedidoInput["galeria"], string> = {
  sin: "Sin galería",
  balcon_techo: "Balcón con techo",
  galeria_perimetral: "Galería perimetral",
};

export const paredInteriorColorLabelsEs: Record<PedidoInput["paredInteriorColor"], string> = {
  blanco: "Blanco",
  gris_claro: "Gris claro",
  beige: "Beige",
  madera_clara: "Madera clara",
  madera_oscura: "Madera oscura",
  personalizado: "Personalizado",
};

export const paredInteriorRevestimientoLabelsEs: Record<
  PedidoInput["paredInteriorRevestimiento"],
  string
> = {
  pintura_lisa: "Pintura lisa",
  panel_madera: "Panel de madera",
  panel_pvc: "Panel de PVC",
  otro: "Otro",
};

export const paredExteriorColorLabelsEs: Record<PedidoInput["paredExteriorColor"], string> = {
  blanco: "Blanco",
  gris: "Gris",
  beige: "Beige",
  arena: "Arena",
  negro_mate: "Negro mate",
  personalizado: "Personalizado",
};

export const paredExteriorRevestimientoLabelsEs: Record<
  PedidoInput["paredExteriorRevestimiento"],
  string
> = {
  chapa_prepintada: "Chapa prepintada (estándar)",
  madera_tratada: "Madera tratada",
  simil_madera: "Revestimiento símil madera",
  otro: "Otro",
};

export const banoRevestimientoLabelsEs: Record<PedidoInput["banoRevestimiento"], string> = {
  ceramico_blanco: "Cerámico blanco",
  ceramico_gris: "Cerámico gris",
  marmol_sintetico: "Mármol sintético",
  madera_pvc: "Madera PVC",
  otro: "Otro",
};

export const banoColorSanitariosLabelsEs: Record<PedidoInput["banoColorSanitarios"], string> = {
  blanco: "Blanco",
  negro: "Negro",
  cromo: "Cromo",
};

export const cocinaRevestimientoLabelsEs: Record<PedidoInput["cocinaRevestimiento"], string> = {
  ceramico_blanco: "Cerámico blanco",
  ceramico_gris: "Cerámico gris",
  acero_inoxidable: "Acero inoxidable",
  otro: "Otro",
};

export const cocinaColorMueblesLabelsEs: Record<PedidoInput["cocinaColorMuebles"], string> = {
  blanco: "Blanco",
  gris: "Gris",
  madera_clara: "Madera clara",
  madera_oscura: "Madera oscura",
};

export const puertaPrincipalTipoLabelsEs: Record<PedidoInput["puertaPrincipalTipo"], string> = {
  placa_simple: "Puerta placa simple",
  placa_vidrio_lateral: "Puerta placa con vidrio lateral",
  doble_hoja: "Puerta doble hoja",
  corrediza: "Puerta corrediza",
};

export const puertaPrincipalMaterialLabelsEs: Record<
  PedidoInput["puertaPrincipalMaterial"],
  string
> = {
  acero_pintado: "Acero pintado",
  aluminio: "Aluminio",
  pvc: "PVC",
};

export const puertaPrincipalColorLabelsEs: Record<PedidoInput["puertaPrincipalColor"], string> = {
  blanco: "Blanco",
  negro: "Negro",
  gris: "Gris",
  igual_exterior: "Igual al exterior",
};

export const puertaInteriorTipoLabelsEs: Record<PedidoInput["puertaInteriorTipo"], string> = {
  placa: "Puerta placa",
  corrediza: "Puerta corrediza",
  sin_puerta: "Sin puerta interior (ambiente abierto)",
};

export const puertaInteriorColorLabelsEs: Record<PedidoInput["puertaInteriorColor"], string> = {
  igual_paredes: "Igual a paredes",
  blanco: "Blanco",
  natural_madera: "Natural madera",
};

export const ventanaTipoLabelsEs: Record<PedidoInput["ventanaTipo"], string> = {
  tipo_a: "Tipo A — Ventana batiente simple",
  tipo_b: "Tipo B — Ventana corrediza doble hoja",
  tipo_c: "Tipo C — Ventana fija panorámica",
};

export function siNo(value: boolean): string {
  return value ? "Sí" : "No";
}
