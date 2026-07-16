import type { PedidoInput } from "@/lib/validators/pedido";

// Etiquetas en inglés — el PDF se genera en inglés para el proveedor.
export const modeloLabels: Record<PedidoInput["modelo"], string> = {
  "10ft": "10ft (18m²)",
  "20ft": "20ft (37m²)",
  "40ft": "40ft (74m²)",
};

export const zonaClimaticaLabels: Record<PedidoInput["zonaClimatica"], string> = {
  templada: "Temperate",
  frio_intenso: "Intense cold",
  calor_extremo: "Extreme heat",
  humedad_alta: "High humidity",
};

export const banoInodoroLabels: Record<PedidoInput["banoInodoro"], string> = {
  estandar: "Standard",
  inteligente_bidet: "Smart toilet with bidet",
};

export const banoEspejoLabels: Record<PedidoInput["banoEspejo"], string> = {
  comun: "Standard mirror",
  inteligente_led: "Smart LED mirror",
};

export const banoDuchaLabels: Record<PedidoInput["banoDucha"], string> = {
  estandar_esquinero: "Standard corner shower",
  premium: "Premium shower",
};

export const cocinaTipoLabels: Record<PedidoInput["cocinaTipo"], string> = {
  vitroceramica: "Built-in ceramic hob",
  espacio_gas: "Space prepared for gas cooking",
};

export const lavarropaUbicacionLabels: Record<
  NonNullable<PedidoInput["lavarropaUbicacion"]>,
  string
> = {
  bano: "Bathroom",
  cocina: "Kitchen",
  espacio_externo: "External space",
};

export const energiaSolarLabels: Record<PedidoInput["energiaSolar"], string> = {
  sin: "No solar installation",
  preinstalacion: "Solar pre-installation",
  kit_incluido: "Solar panel kit included",
};

export const calefonLabels: Record<PedidoInput["calefon"], string> = {
  sin: "None",
  electrico: "Electric water heater, factory installed",
};

export const galeriaLabels: Record<PedidoInput["galeria"], string> = {
  sin: "No balcony or gallery",
  balcon_techo: "Covered balcony",
  galeria_perimetral: "Full perimeter gallery",
};

export function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

// ─── Acabados y diseño ─────────────────────────────────────

export const paredInteriorColorLabels: Record<PedidoInput["paredInteriorColor"], string> = {
  blanco: "White",
  gris_claro: "Light grey",
  beige: "Beige",
  madera_clara: "Light wood",
  madera_oscura: "Dark wood",
  personalizado: "Custom",
};

export const paredInteriorRevestimientoLabels: Record<
  PedidoInput["paredInteriorRevestimiento"],
  string
> = {
  pintura_lisa: "Flat paint",
  panel_madera: "Wood panel",
  panel_pvc: "PVC panel",
  otro: "Other",
};

export const paredExteriorColorLabels: Record<PedidoInput["paredExteriorColor"], string> = {
  blanco: "White",
  gris: "Grey",
  beige: "Beige",
  arena: "Sand",
  negro_mate: "Matte black",
  personalizado: "Custom",
};

export const paredExteriorRevestimientoLabels: Record<
  PedidoInput["paredExteriorRevestimiento"],
  string
> = {
  chapa_prepintada: "Pre-painted sheet metal (standard)",
  madera_tratada: "Treated wood",
  simil_madera: "Wood-look cladding",
  otro: "Other",
};

export const banoRevestimientoLabels: Record<PedidoInput["banoRevestimiento"], string> = {
  ceramico_blanco: "White ceramic tile",
  ceramico_gris: "Grey ceramic tile",
  marmol_sintetico: "Synthetic marble",
  madera_pvc: "PVC wood-look panel",
  otro: "Other",
};

export const banoColorSanitariosLabels: Record<PedidoInput["banoColorSanitarios"], string> = {
  blanco: "White",
  negro: "Black",
  cromo: "Chrome",
};

export const cocinaRevestimientoLabels: Record<PedidoInput["cocinaRevestimiento"], string> = {
  ceramico_blanco: "White ceramic tile",
  ceramico_gris: "Grey ceramic tile",
  acero_inoxidable: "Stainless steel",
  otro: "Other",
};

export const cocinaColorMueblesLabels: Record<PedidoInput["cocinaColorMuebles"], string> = {
  blanco: "White",
  gris: "Grey",
  madera_clara: "Light wood",
  madera_oscura: "Dark wood",
};

// ─── Puertas y aberturas ───────────────────────────────────

export const puertaPrincipalTipoLabels: Record<PedidoInput["puertaPrincipalTipo"], string> = {
  placa_simple: "Simple flush door",
  placa_vidrio_lateral: "Flush door with side glass panel",
  doble_hoja: "Double-leaf door",
  corrediza: "Sliding door",
};

export const puertaPrincipalMaterialLabels: Record<
  PedidoInput["puertaPrincipalMaterial"],
  string
> = {
  acero_pintado: "Painted steel",
  aluminio: "Aluminum",
  pvc: "PVC",
};

export const puertaPrincipalColorLabels: Record<PedidoInput["puertaPrincipalColor"], string> = {
  blanco: "White",
  negro: "Black",
  gris: "Grey",
  igual_exterior: "Matches exterior",
};

export const puertaInteriorTipoLabels: Record<PedidoInput["puertaInteriorTipo"], string> = {
  placa: "Flush door",
  corrediza: "Sliding door",
  sin_puerta: "No interior door (open space)",
};

export const puertaInteriorColorLabels: Record<PedidoInput["puertaInteriorColor"], string> = {
  igual_paredes: "Matches walls",
  blanco: "White",
  natural_madera: "Natural wood",
};

export const ventanaTipoLabels: Record<PedidoInput["ventanaTipo"], string> = {
  tipo_a: "Type A — Simple casement window",
  tipo_b: "Type B — Double-leaf sliding window",
  tipo_c: "Type C — Fixed panoramic window",
};
