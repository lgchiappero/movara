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
  vitroceramica: "Ceramic cooktop",
  espacio_gas: "Gas cooking space",
};

export const lavarropasLabels: Record<PedidoInput["lavarropas"], string> = {
  sin_preinstalacion: "No pre-installation",
  con_preinstalacion: "With pre-installation",
};

export const energiaSolarLabels: Record<PedidoInput["energiaSolar"], string> = {
  sin: "None",
  preinstalacion: "Pre-installation only",
  kit_incluido: "Kit included",
};

export const calefonLabels: Record<PedidoInput["calefon"], string> = {
  sin: "None",
  electrico: "Electric water heater",
};

export const galeriaLabels: Record<PedidoInput["galeria"], string> = {
  sin: "None",
  balcon_techo: "Balcony with roof",
  galeria_perimetral: "Perimeter gallery",
};

export function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}
