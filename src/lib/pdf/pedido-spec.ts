import { getModeloKey, REGIONAL_MODELS } from "@/data/regional-models";
import { findUpgrade } from "@/data/configurador-catalog";
import { findAdminExtraLabel } from "@/data/admin-extras";
import { MATERIAL_CATEGORY_GROUPS, findMaterialOption } from "@/data/material-catalog";
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
  galeria: "Covered gallery",
};

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

  const upgradeRows = (data.upgrades ?? [])
    .map((key) => findUpgrade(regionalKey, key)?.nombre ?? findAdminExtraLabel(key))
    .filter((n): n is string => Boolean(n))
    .map((nombre) => ({ label: "Upgrade", value: nombre }));

  const materialGroups: SupplierSpecGroup[] = MATERIAL_CATEGORY_GROUPS.map((group) => {
    const seenKeys = new Set<string>();
    const rows: { label: string; value: string }[] = [];
    for (const selector of group.selectors) {
      if (seenKeys.has(selector.key)) continue;
      seenKeys.add(selector.key);
      const raw = materiales[selector.key] ?? null;
      const found = findMaterialOption(selector.key, raw);
      rows.push({
        label: SELECTOR_LABELS_EN[selector.key] ?? selector.key,
        value: found ? found.option.label : raw ? raw : "Not included",
      });
    }
    return { type: "group", title: group.title, rows };
  });

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
  ];
}
