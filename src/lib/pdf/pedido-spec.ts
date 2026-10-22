import { getModeloKey, REGIONAL_MODELS } from "@/data/regional-models";
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
  finalidadLabels,
  tipoCocinaLabels,
  tipoAguaLabels,
  lavarropasLabels,
} from "@/lib/pdf/pedido-labels";
import { MODEL_CODES } from "@/lib/pdf/model-codes";

// Referencia técnica en inglés para el proveedor. Las etiquetas de materiales
// (StepMateriales.tsx) están solo en español — se muestran tal cual acá;
// traducirlas al inglés queda fuera de este alcance.
const SELECTOR_LABELS_EN: Record<string, string> = {
  exterior: "Exterior finish",
  piso: "Flooring",
  panelesBano: "Bathroom wall panels",
  puertaBano: "Bathroom door",
  banera: "Bathtub",
  cocina: "Kitchen",
  mesada: "Countertop",
  cocinaAmpliada: "Extended kitchen",
  puertaPrincipal: "Main door",
  ventanas: "Windows",
  muroVidrio: "Glass curtain wall",
  balcon: "Balcony",
  techoBalcon: "Balcony roof",
};

/** Extras sin precio de lista: MOVARA los presupuesta aparte. */
const TO_QUOTE = "To quote (A cotizar)";

const MODEL_CODES_LOOSE = MODEL_CODES as Record<string, string>;
const TBD = "To be defined";

export type SupplierSpecLine = { type: "line"; label: string; value: string };
export type SupplierSpecGroup = {
  type: "group";
  title: string;
  rows: { label: string; value: string }[];
  note?: string;
};
export type SupplierSpecItem = SupplierSpecLine | SupplierSpecGroup;

export function buildSupplierSpecItems(data: PedidoRecord): SupplierSpecItem[] {
  const regionalKey = getModeloKey(data.provincia ?? "", data.localidad ?? undefined);
  const regional = REGIONAL_MODELS[regionalKey];
  const materiales = data.materiales ?? {};

  const upgradeRows = (data.upgrades ?? []).map((key) => ({ label: "Upgrade", value: getStoredUpgradeLabel(key) }));

  const materialGroups: SupplierSpecGroup[] = MATERIAL_CATEGORY_GROUPS.map((group) => {
    const seenKeys = new Set<string>();
    const rows: { label: string; value: string }[] = [];
    for (const selector of group.selectors) {
      if (seenKeys.has(selector.key)) continue;
      seenKeys.add(selector.key);
      const valor = getStoredMaterialLabel(selector.key, materiales[selector.key] ?? null);
      const toQuote = valor && esSelectorAConsultar(selector.key) ? ` — ${TO_QUOTE}` : "";
      rows.push({
        label: SELECTOR_LABELS_EN[selector.key] ?? selector.key,
        value: valor ? `${valor}${toQuote}` : "Not included",
      });
    }
    return { type: "group", title: group.title, rows };
  });
  // Selectores que ya no existen (ej. la galería): se agregan al final.
  const anteriores = getMaterialesAnteriores(materiales).map((m) => ({ label: m.nombre, value: m.label }));
  if (anteriores.length) materialGroups.push({ type: "group", title: "Previous configuration", rows: anteriores });

  const modeloCode = data.modelo ? (MODEL_CODES_LOOSE[data.modelo] ?? TBD) : TBD;

  return [
    {
      type: "line",
      label: "MODEL",
      value: data.modelo ? `${data.modelo} (ref. code: ${modeloCode})` : TBD,
    },
    { type: "line", label: "PURPOSE", value: labelOrFallback(finalidadLabels, data.finalidad, TBD) },
    {
      type: "line",
      label: "LOCATION",
      value: [data.localidad, data.provincia].filter(Boolean).join(", ") || SIN_ESPECIFICAR,
    },
    { type: "line", label: "REGION", value: regional?.region ?? regionalKey },
    {
      type: "group",
      title: "LAYOUT",
      rows: [
        { label: "Bedrooms", value: data.habitaciones != null ? String(data.habitaciones) : TBD },
        {
          label: "Kitchen",
          value: data.incluyeCocina ? labelOrFallback(tipoCocinaLabels, data.tipoCocina, TBD) : "Not included",
        },
        {
          label: "Bathroom",
          value: data.incluyeBano ? labelOrFallback(tipoAguaLabels, data.tipoAgua, TBD) : "Not included",
        },
        { label: "Washing machine", value: labelOrFallback(lavarropasLabels, data.lavarropas, TBD) },
      ],
    },
    ...materialGroups,
    ...(upgradeRows.length
      ? [{ type: "group" as const, title: "UPGRADES TO QUOTE", rows: upgradeRows }]
      : []),
    // Texto libre del cliente, en castellano tal como lo escribió.
    ...(data.notasConfiguracion
      ? [{ type: "line" as const, label: "CLIENT NOTES (ES)", value: data.notasConfiguracion }]
      : []),
  ];
}
