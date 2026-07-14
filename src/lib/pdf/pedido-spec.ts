import type { PedidoInput } from "@/lib/validators/pedido";
import {
  modeloLabels,
  zonaClimaticaLabels,
  banoInodoroLabels,
  banoEspejoLabels,
  banoDuchaLabels,
  cocinaTipoLabels,
  lavarropaUbicacionLabels,
  energiaSolarLabels,
  calefonLabels,
  galeriaLabels,
  paredInteriorColorLabels,
  paredInteriorRevestimientoLabels,
  paredExteriorColorLabels,
  paredExteriorRevestimientoLabels,
  banoRevestimientoLabels,
  banoColorSanitariosLabels,
  cocinaRevestimientoLabels,
  cocinaColorMueblesLabels,
  puertaPrincipalTipoLabels,
  puertaPrincipalMaterialLabels,
  puertaPrincipalColorLabels,
  puertaInteriorTipoLabels,
  puertaInteriorColorLabels,
  ventanaTipoLabels,
  yesNo,
} from "@/lib/pdf/pedido-labels";

export type PedidoSpecSection = {
  title: string;
  rows: { label: string; value: string }[];
  note?: string;
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
        {
          label: "Washing machine space",
          value: data.lavarropaIncluye
            ? `Yes — ${lavarropaUbicacionLabels[data.lavarropaUbicacion!]}`
            : "No",
        },
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
    {
      title: "9. FINISHES & DESIGN",
      rows: [
        { label: "Interior wall color", value: paredInteriorColorLabels[data.paredInteriorColor] },
        {
          label: "Interior wall cladding",
          value: paredInteriorRevestimientoLabels[data.paredInteriorRevestimiento],
        },
        { label: "Exterior wall color", value: paredExteriorColorLabels[data.paredExteriorColor] },
        {
          label: "Exterior wall cladding",
          value: paredExteriorRevestimientoLabels[data.paredExteriorRevestimiento],
        },
        { label: "Bathroom wall cladding", value: banoRevestimientoLabels[data.banoRevestimiento] },
        { label: "Bathroom fixtures color", value: banoColorSanitariosLabels[data.banoColorSanitarios] },
        { label: "Kitchen wall cladding", value: cocinaRevestimientoLabels[data.cocinaRevestimiento] },
        { label: "Kitchen cabinets color", value: cocinaColorMueblesLabels[data.cocinaColorMuebles] },
      ],
    },
    {
      title: "10. DOORS & OPENINGS",
      rows: [
        { label: "Main door type", value: puertaPrincipalTipoLabels[data.puertaPrincipalTipo] },
        {
          label: "Main door material",
          value: puertaPrincipalMaterialLabels[data.puertaPrincipalMaterial],
        },
        { label: "Main door color", value: puertaPrincipalColorLabels[data.puertaPrincipalColor] },
        { label: "Interior door type", value: puertaInteriorTipoLabels[data.puertaInteriorTipo] },
        { label: "Interior door color", value: puertaInteriorColorLabels[data.puertaInteriorColor] },
        { label: "Window type", value: ventanaTipoLabels[data.ventanaTipo] },
      ],
      note: "All window types include double glazing (DVH) and mosquito net.",
    },
  ];
}

export function buildPedidoSpecText(
  data: PedidoInput,
  meta: { fecha: string; clienteNombre: string; clienteWhatsapp: string }
): string {
  const sections = buildPedidoSpecSections(data);
  const body = sections
    .map((s) => {
      const rows = s.rows.map((r) => `   - ${r.label}: ${r.value}`).join("\n");
      const note = s.note ? `\n   Note: ${s.note}` : "";
      return `${s.title}\n${rows}${note}`;
    })
    .join("\n\n");

  return `MOVARA ESPACIOS MODULARES — PURCHASE ORDER SPEC
Date: ${meta.fecha}
Client: ${meta.clienteNombre}
Contact: ${meta.clienteWhatsapp}

${body}`;
}
