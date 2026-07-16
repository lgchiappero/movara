import type { PedidoInput } from "@/lib/validators/pedido";
import {
  modeloLabelsEs,
  zonaClimaticaLabelsEs,
  cocinaTipoLabelsEs,
  lavarropaUbicacionLabelsEs,
  energiaSolarLabelsEs,
  calefonLabelsEs,
  galeriaLabelsEs,
  paredInteriorColorLabelsEs,
  paredInteriorRevestimientoLabelsEs,
  paredExteriorColorLabelsEs,
  paredExteriorRevestimientoLabelsEs,
  banoRevestimientoLabelsEs,
  banoColorSanitariosLabelsEs,
  cocinaRevestimientoLabelsEs,
  cocinaColorMueblesLabelsEs,
  puertaPrincipalTipoLabelsEs,
  puertaPrincipalMaterialLabelsEs,
  puertaPrincipalColorLabelsEs,
  puertaInteriorTipoLabelsEs,
  puertaInteriorColorLabelsEs,
  ventanaTipoLabelsEs,
  siNo,
} from "@/lib/pdf/pedido-labels-es";

const banoInodoroPhrases: Record<PedidoInput["banoInodoro"], string> = {
  estandar: "Inodoro estándar",
  inteligente_bidet: "Inodoro inteligente con bidet",
};

const banoEspejoPhrases: Record<PedidoInput["banoEspejo"], string> = {
  comun: "Espejo común",
  inteligente_led: "Espejo inteligente con LED",
};

const banoDuchaPhrases: Record<PedidoInput["banoDucha"], string> = {
  estandar_esquinero: "Cabina de ducha estándar esquinero",
  premium: "Cabina de ducha premium",
};

function lavarropaFrase(data: PedidoInput): string {
  if (!data.lavarropaIncluye) return "sin espacio previsto";
  const ubicacion = data.lavarropaUbicacion!;
  if (ubicacion === "bano") return "con espacio en el baño";
  if (ubicacion === "cocina") return "con espacio en la cocina";
  return "con espacio externo previsto";
}

export type NarrativeLine = { type: "line"; label: string; value: string };
export type NarrativeGroup = { type: "group"; title: string; bullets: string[]; note?: string };
export type NarrativeItem = NarrativeLine | NarrativeGroup;

export function buildPedidoNarrativeEs(data: PedidoInput): NarrativeItem[] {
  return [
    { type: "line", label: "Modelo", value: modeloLabelsEs[data.modelo] },
    { type: "line", label: "Zona de instalación", value: zonaClimaticaLabelsEs[data.zonaClimatica] },
    {
      type: "group",
      title: "Baño",
      bullets: [
        banoInodoroPhrases[data.banoInodoro],
        banoEspejoPhrases[data.banoEspejo],
        banoDuchaPhrases[data.banoDucha],
      ],
    },
    {
      type: "group",
      title: "Cocina",
      bullets: [
        cocinaTipoLabelsEs[data.cocinaTipo],
        `Extractor de cocina: ${siNo(data.cocinaExtractor)}`,
        `Alacena superior: ${siNo(data.cocinaAlacena)}`,
        `Ventana cerca de la cocción: ${siNo(data.cocinaVentana)}`,
      ],
    },
    {
      type: "group",
      title: "Aberturas",
      bullets: [
        `Rejas: ${siNo(data.aberturaRejas)}`,
        `Mosquiteros: ${siNo(data.aberturaMosquitero)}`,
        `Cortinas: ${siNo(data.aberturaCortinas)}`,
      ],
    },
    { type: "line", label: "Lavarropas", value: lavarropaFrase(data) },
    {
      type: "line",
      label: "Energía solar",
      value: energiaSolarLabelsEs[data.energiaSolar].toLowerCase(),
    },
    { type: "line", label: "Calefón", value: calefonLabelsEs[data.calefon].toLowerCase() },
    { type: "line", label: "Galería y balcón", value: galeriaLabelsEs[data.galeria].toLowerCase() },
    {
      type: "group",
      title: "Mejoras térmicas",
      bullets: [
        `Paredes de 100mm: ${siNo(data.mejoraParedes100)}`,
        `Triple vidrio: ${siNo(data.mejoraTripleVidrio)}`,
        `Techo con panel sándwich: ${siNo(data.mejoraTechoSandwich)}`,
      ],
    },
    {
      type: "group",
      title: "Acabados y diseño",
      bullets: [
        `Color de paredes interiores: ${paredInteriorColorLabelsEs[data.paredInteriorColor]}`,
        `Revestimiento interior: ${paredInteriorRevestimientoLabelsEs[data.paredInteriorRevestimiento]}`,
        `Color exterior: ${paredExteriorColorLabelsEs[data.paredExteriorColor]}`,
        `Revestimiento exterior: ${paredExteriorRevestimientoLabelsEs[data.paredExteriorRevestimiento]}`,
        `Revestimiento de paredes del baño: ${banoRevestimientoLabelsEs[data.banoRevestimiento]}`,
        `Color de sanitarios: ${banoColorSanitariosLabelsEs[data.banoColorSanitarios]}`,
        `Revestimiento de paredes de la cocina: ${cocinaRevestimientoLabelsEs[data.cocinaRevestimiento]}`,
        `Color de muebles de cocina: ${cocinaColorMueblesLabelsEs[data.cocinaColorMuebles]}`,
      ],
    },
    {
      type: "group",
      title: "Puertas y aberturas",
      bullets: [
        `Puerta principal: ${puertaPrincipalTipoLabelsEs[data.puertaPrincipalTipo]}, ${puertaPrincipalMaterialLabelsEs[data.puertaPrincipalMaterial].toLowerCase()}, color ${puertaPrincipalColorLabelsEs[data.puertaPrincipalColor].toLowerCase()}`,
        `Puerta interior: ${puertaInteriorTipoLabelsEs[data.puertaInteriorTipo].toLowerCase()}, color ${puertaInteriorColorLabelsEs[data.puertaInteriorColor].toLowerCase()}`,
        `Ventanas: ${ventanaTipoLabelsEs[data.ventanaTipo]}`,
      ],
      note: "Las ventanas incluyen DVH (doble vidrio hermético) y mosquitero en todos los tipos.",
    },
  ];
}
