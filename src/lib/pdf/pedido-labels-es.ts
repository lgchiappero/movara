import type { PedidoInput, TipoAguaDiscontinuado } from "@/lib/validators/pedido";
import { FINALIDADES } from "@/data/configurador-catalog";

// Etiquetas en español — compartidas entre el PDF y el panel admin.

export const modeloLabelsEs: Record<PedidoInput["modelo"], string> = {
  "10ft": "10ft — 18 m²",
  "20ft": "20ft — 38 m²",
  "40ft": "40ft — 77 m²",
};

export const finalidadLabelsEs: Record<PedidoInput["finalidad"], string> = Object.fromEntries(
  FINALIDADES.map((f) => [f.key, f.label])
) as Record<PedidoInput["finalidad"], string>;

export const tipoCocinaLabelsEs: Record<PedidoInput["tipoCocina"], string> = {
  electrico: "Anafe eléctrico",
  gas: "Preparación para gas",
};

// Incluye la opción discontinuada, para que los pedidos viejos se sigan viendo.
export const tipoAguaLabelsEs: Record<PedidoInput["tipoAgua"] | TipoAguaDiscontinuado, string> = {
  "calefon-electrico": "Calefón eléctrico",
  "termotanque-gas": "Termotanque a gas (opción discontinuada)",
};

export const lavarropasLabelsEs: Record<PedidoInput["lavarropas"], string> = {
  sin: "Sin espacio previsto",
  bano: "Espacio en el baño",
  cocina: "Espacio en la cocina",
  externo: "Espacio externo con desagüe",
};

export function siNo(value: boolean): string {
  return value ? "Sí" : "No";
}
