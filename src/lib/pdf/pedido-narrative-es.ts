import { getStoredUpgradeLabel } from "@/data/configurador-catalog";
import {
  MATERIAL_CATEGORY_GROUPS,
  getStoredMaterialLabel,
  esSelectorAConsultar,
  getMaterialesAnteriores,
} from "@/data/material-catalog";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";
import { labelOrFallback, SIN_ESPECIFICAR } from "@/lib/pdf/pedido-record";
import {
  modeloLabelsEs,
  finalidadLabelsEs,
  tipoCocinaLabelsEs,
  tipoAguaLabelsEs,
  lavarropasLabelsEs,
} from "@/lib/pdf/pedido-labels-es";

// Nombre de campo legible por selector — selector.label describe el tramo
// de opciones ("Opciones base — sin costo"), no el campo en sí.
const SELECTOR_LABELS_ES: Record<string, string> = {
  exterior: "Exterior",
  piso: "Piso",
  panelesBano: "Paneles del baño",
  puertaBano: "Puerta del baño",
  banera: "Bañera",
  cocina: "Cocina",
  mesada: "Mesada",
  cocinaAmpliada: "Cocina ampliada",
  puertaPrincipal: "Puerta principal",
  ventanas: "Ventanas",
  muroVidrio: "Muro cortina de vidrio",
  balcon: "Balcón",
  techoBalcon: "Techo del balcón",
};

/** Extras sin precio de lista (balcón, techo, muro cortina): MOVARA los
 *  presupuesta aparte. */
export const A_COTIZAR = "A cotizar";

export type NarrativeLine = { type: "line"; label: string; value: string };
export type NarrativeGroup = { type: "group"; title: string; bullets: string[]; note?: string };
export type NarrativeItem = NarrativeLine | NarrativeGroup;

export function buildPedidoNarrativeEs(data: PedidoRecord): NarrativeItem[] {
  const materiales = data.materiales ?? {};

  const cocinaTxt = data.incluyeCocina
    ? labelOrFallback(tipoCocinaLabelsEs, data.tipoCocina)
    : "Sin cocina";
  const banoTxt = data.incluyeBano
    ? `Con baño — ${labelOrFallback(tipoAguaLabelsEs, data.tipoAgua).toLowerCase()}`
    : "Sin baño";

  const upgradeBullets = (data.upgrades ?? []).map(getStoredUpgradeLabel);

  const materialGroups: NarrativeGroup[] = MATERIAL_CATEGORY_GROUPS.map((group) => {
    const seenKeys = new Set<string>();
    const bullets: string[] = [];
    for (const selector of group.selectors) {
      if (seenKeys.has(selector.key)) continue;
      seenKeys.add(selector.key);
      const nombreCampo = SELECTOR_LABELS_ES[selector.key] ?? selector.key;
      // El valor guardado puede ser un id de catálogo (configurador público),
      // un id de una opción retirada o texto libre cargado a mano por el admin.
      const valor = getStoredMaterialLabel(selector.key, materiales[selector.key] ?? null);
      const aCotizar = valor && esSelectorAConsultar(selector.key) ? ` — ${A_COTIZAR}` : "";
      bullets.push(`${nombreCampo}: ${valor ?? "no incluye"}${aCotizar}`);
    }
    return { type: "group", title: group.title, bullets };
  });
  // Selectores que ya no existen (ej. la galería): se agregan al final.
  const anteriores = getMaterialesAnteriores(materiales).map((m) => `${m.nombre}: ${m.label}`);
  if (anteriores.length) materialGroups.push({ type: "group", title: "Configuración anterior", bullets: anteriores });

  return [
    { type: "line", label: "Modelo", value: labelOrFallback(modeloLabelsEs, data.modelo) },
    { type: "line", label: "Finalidad", value: labelOrFallback(finalidadLabelsEs, data.finalidad) },
    {
      type: "line",
      label: "Ubicación",
      value: [data.localidad, data.provincia].filter(Boolean).join(", ") || SIN_ESPECIFICAR,
    },
    {
      type: "group",
      title: "Configuración del espacio",
      bullets: [
        `Habitaciones: ${data.habitaciones ?? SIN_ESPECIFICAR}`,
        `Cocina: ${cocinaTxt}`,
        `Baño: ${banoTxt}`,
        `Lavarropas: ${labelOrFallback(lavarropasLabelsEs, data.lavarropas).toLowerCase()}`,
      ],
    },
    ...materialGroups,
    ...(upgradeBullets.length
      ? [{ type: "group" as const, title: "Mejoras a cotizar", bullets: upgradeBullets }]
      : []),
    ...(data.notasConfiguracion
      ? [{ type: "line" as const, label: "Notas del cliente", value: data.notasConfiguracion }]
      : []),
  ];
}
