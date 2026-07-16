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
import { MODEL_CODES } from "@/lib/pdf/model-codes";

export type SupplierSpecLine = { type: "line"; label: string; value: string };
export type SupplierSpecGroup = {
  type: "group";
  title: string;
  rows: { label: string; value: string }[];
  note?: string;
};
export type SupplierSpecItem = SupplierSpecLine | SupplierSpecGroup;

export function buildSupplierSpecItems(data: PedidoInput): SupplierSpecItem[] {
  return [
    {
      type: "line",
      label: "MODEL",
      value: `${data.modelo} (ref. code: ${MODEL_CODES[data.modelo]})`,
    },
    { type: "line", label: "CLIMATE ZONE", value: zonaClimaticaLabels[data.zonaClimatica] },
    {
      type: "group",
      title: "BATHROOM",
      rows: [
        { label: "Toilet", value: banoInodoroLabels[data.banoInodoro] },
        { label: "Mirror", value: banoEspejoLabels[data.banoEspejo] },
        { label: "Shower cabin", value: banoDuchaLabels[data.banoDucha] },
      ],
    },
    {
      type: "group",
      title: "KITCHEN",
      rows: [
        { label: "Cooking", value: cocinaTipoLabels[data.cocinaTipo] },
        { label: "Extractor hood", value: yesNo(data.cocinaExtractor) },
        { label: "Upper cabinets", value: yesNo(data.cocinaAlacena) },
        { label: "Window near cooking area", value: yesNo(data.cocinaVentana) },
      ],
    },
    {
      type: "group",
      title: "OPENINGS",
      rows: [
        { label: "Security bars", value: yesNo(data.aberturaRejas) },
        { label: "Mosquito nets", value: yesNo(data.aberturaMosquitero) },
        { label: "Curtains", value: yesNo(data.aberturaCortinas) },
      ],
    },
    {
      type: "group",
      title: "LAUNDRY / ENERGY / COMFORT",
      rows: [
        {
          label: "Washing machine",
          value: data.lavarropaIncluye
            ? `Yes — ${lavarropaUbicacionLabels[data.lavarropaUbicacion!]}`
            : "No",
        },
        { label: "Solar energy", value: energiaSolarLabels[data.energiaSolar] },
        { label: "Water heater", value: calefonLabels[data.calefon] },
      ],
    },
    {
      type: "group",
      title: "EXTERIOR",
      rows: [{ label: "Balcony/gallery", value: galeriaLabels[data.galeria] }],
    },
    {
      type: "group",
      title: "THERMAL UPGRADES",
      rows: [
        { label: "100mm wall panels", value: yesNo(data.mejoraParedes100) },
        { label: "Triple glazing", value: yesNo(data.mejoraTripleVidrio) },
        { label: "Sandwich panel roof", value: yesNo(data.mejoraTechoSandwich) },
      ],
    },
    {
      type: "group",
      title: "FINISHES & DESIGN",
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
        {
          label: "Bathroom fixtures color",
          value: banoColorSanitariosLabels[data.banoColorSanitarios],
        },
        { label: "Kitchen wall cladding", value: cocinaRevestimientoLabels[data.cocinaRevestimiento] },
        { label: "Kitchen cabinets color", value: cocinaColorMueblesLabels[data.cocinaColorMuebles] },
      ],
    },
    {
      type: "group",
      title: "DOORS & OPENINGS",
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
