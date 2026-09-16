import { getModeloKey, REGIONAL_MODELS } from "@/data/regional-models";
import { findUpgrade } from "@/data/configurador-catalog";
import { MATERIAL_CATEGORY_GROUPS, findMaterialOption } from "@/data/material-catalog";
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
  galeria: "Galería con sobretecho",
};

export type NarrativeLine = { type: "line"; label: string; value: string };
export type NarrativeGroup = { type: "group"; title: string; bullets: string[]; note?: string };
export type NarrativeItem = NarrativeLine | NarrativeGroup;

export function buildPedidoNarrativeEs(data: PedidoRecord): NarrativeItem[] {
  const regionalKey = getModeloKey(data.provincia ?? "", data.localidad ?? undefined);
  const regional = REGIONAL_MODELS[regionalKey];
  const materiales = data.materiales ?? {};

  const cocinaTxt = data.incluyeCocina
    ? labelOrFallback(tipoCocinaLabelsEs, data.tipoCocina)
    : "Sin cocina";
  const banoTxt = data.incluyeBano
    ? `Con baño — ${labelOrFallback(tipoAguaLabelsEs, data.tipoAgua).toLowerCase()}`
    : "Sin baño";

  const upgradeBullets = (data.upgrades ?? [])
    .map((key) => findUpgrade(regionalKey, key)?.nombre)
    .filter((n): n is string => Boolean(n));

  const materialGroups: NarrativeGroup[] = MATERIAL_CATEGORY_GROUPS.map((group) => {
    const seenKeys = new Set<string>();
    const bullets: string[] = [];
    for (const selector of group.selectors) {
      if (seenKeys.has(selector.key)) continue;
      seenKeys.add(selector.key);
      const found = findMaterialOption(selector.key, materiales[selector.key] ?? null);
      const nombreCampo = SELECTOR_LABELS_ES[selector.key] ?? selector.key;
      bullets.push(found ? `${nombreCampo}: ${found.option.label}` : `${nombreCampo}: no incluye`);
    }
    return { type: "group", title: group.title, bullets };
  });

  return [
    { type: "line", label: "Modelo", value: labelOrFallback(modeloLabelsEs, data.modelo) },
    { type: "line", label: "Finalidad", value: labelOrFallback(finalidadLabelsEs, data.finalidad) },
    {
      type: "line",
      label: "Ubicación",
      value: [data.localidad, data.provincia].filter(Boolean).join(", ") || SIN_ESPECIFICAR,
    },
    { type: "line", label: "Zona", value: regional?.region ?? regionalKey },
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
  ];
}
