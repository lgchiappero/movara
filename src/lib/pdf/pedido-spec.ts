import type { PedidoInput } from "@/lib/validators/pedido";
import {
  modeloLabels,
  zonaClimaticaLabels,
  banoInodoroLabels,
  banoEspejoLabels,
  banoDuchaLabels,
  cocinaTipoLabels,
  lavarropasLabels,
  energiaSolarLabels,
  calefonLabels,
  galeriaLabels,
  yesNo,
} from "@/lib/pdf/pedido-labels";

export type PedidoSpecSection = {
  title: string;
  rows: { label: string; value: string }[];
};

export function buildPedidoSpecSections(data: PedidoInput): PedidoSpecSection[] {
  return [
    {
      title: "1. MODEL",
      rows: [{ label: "Model", value: modeloLabels[data.modelo] }],
    },
    {
      title: "2. INSTALLATION CLIMATE ZONE",
      rows: [{ label: "Climate zone", value: zonaClimaticaLabels[data.zonaClimatica] }],
    },
    {
      title: "3. BATHROOM CONFIGURATION",
      rows: [
        { label: "Toilet", value: banoInodoroLabels[data.banoInodoro] },
        { label: "Mirror", value: banoEspejoLabels[data.banoEspejo] },
        { label: "Shower cabin", value: banoDuchaLabels[data.banoDucha] },
      ],
    },
    {
      title: "4. KITCHEN CONFIGURATION",
      rows: [
        { label: "Cooking setup", value: cocinaTipoLabels[data.cocinaTipo] },
        { label: "Extractor hood", value: yesNo(data.cocinaExtractor) },
        { label: "Upper cabinets", value: yesNo(data.cocinaAlacena) },
        { label: "Window near cooking area", value: yesNo(data.cocinaVentana) },
      ],
    },
    {
      title: "5. OPENINGS",
      rows: [
        { label: "Security bars", value: yesNo(data.aberturaRejas) },
        { label: "Mosquito nets", value: yesNo(data.aberturaMosquitero) },
        { label: "Curtains included", value: yesNo(data.aberturaCortinas) },
      ],
    },
    {
      title: "6. LAUNDRY / ENERGY / COMFORT",
      rows: [
        { label: "Washing machine setup", value: lavarropasLabels[data.lavarropas] },
        { label: "Solar energy", value: energiaSolarLabels[data.energiaSolar] },
        { label: "Water heater", value: calefonLabels[data.calefon] },
      ],
    },
    {
      title: "7. EXTERIOR / BALCONY",
      rows: [{ label: "Configuration", value: galeriaLabels[data.galeria] }],
    },
    {
      title: "8. THERMAL EFFICIENCY UPGRADES",
      rows: [
        { label: "100mm wall panels", value: yesNo(data.mejoraParedes100) },
        { label: "Triple glazing", value: yesNo(data.mejoraTripleVidrio) },
        { label: "Sandwich panel roof", value: yesNo(data.mejoraTechoSandwich) },
      ],
    },
  ];
}

export function buildPedidoSpecText(
  data: PedidoInput,
  meta: { fecha: string; clienteNombre: string; clienteWhatsapp: string }
): string {
  const sections = buildPedidoSpecSections(data);
  const body = sections
    .map((s) => `${s.title}\n${s.rows.map((r) => `   - ${r.label}: ${r.value}`).join("\n")}`)
    .join("\n\n");

  return `MOVARA ESPACIOS MODULARES — PURCHASE ORDER SPEC
Date: ${meta.fecha}
Client: ${meta.clienteNombre}
Contact: ${meta.clienteWhatsapp}

${body}`;
}
