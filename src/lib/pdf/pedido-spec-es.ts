import type { PedidoInput } from "@/lib/validators/pedido";
import {
  modeloLabelsEs,
  zonaClimaticaLabelsEs,
  banoInodoroLabelsEs,
  banoEspejoLabelsEs,
  banoDuchaLabelsEs,
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
import type { PedidoSpecSection } from "@/lib/pdf/pedido-spec";

export function buildPedidoSpecSectionsEs(data: PedidoInput): PedidoSpecSection[] {
  return [
    {
      title: "1. MODELO",
      rows: [{ label: "Modelo", value: modeloLabelsEs[data.modelo] }],
    },
    {
      title: "2. ZONA CLIMÁTICA DE INSTALACIÓN",
      rows: [{ label: "Zona climática", value: zonaClimaticaLabelsEs[data.zonaClimatica] }],
    },
    {
      title: "3. BAÑO",
      rows: [
        { label: "Inodoro", value: banoInodoroLabelsEs[data.banoInodoro] },
        { label: "Espejo", value: banoEspejoLabelsEs[data.banoEspejo] },
        { label: "Cabina de ducha", value: banoDuchaLabelsEs[data.banoDucha] },
      ],
    },
    {
      title: "4. COCINA",
      rows: [
        { label: "Tipo de cocción", value: cocinaTipoLabelsEs[data.cocinaTipo] },
        { label: "Extractor de olores", value: siNo(data.cocinaExtractor) },
        { label: "Alacena superior", value: siNo(data.cocinaAlacena) },
        { label: "Ventana cerca de la cocción", value: siNo(data.cocinaVentana) },
      ],
    },
    {
      title: "5. ABERTURAS",
      rows: [
        { label: "Rejas de seguridad", value: siNo(data.aberturaRejas) },
        { label: "Mosquiteros", value: siNo(data.aberturaMosquitero) },
        { label: "Cortinas incluidas", value: siNo(data.aberturaCortinas) },
      ],
    },
    {
      title: "6. LAVARROPAS, ENERGÍA Y CONFORT",
      rows: [
        {
          label: "Espacio para lavarropas",
          value: data.lavarropaIncluye
            ? `Sí — ${lavarropaUbicacionLabelsEs[data.lavarropaUbicacion!]}`
            : "No",
        },
        { label: "Energía solar", value: energiaSolarLabelsEs[data.energiaSolar] },
        { label: "Calefón", value: calefonLabelsEs[data.calefon] },
      ],
    },
    {
      title: "7. GALERÍA Y BALCÓN",
      rows: [{ label: "Configuración", value: galeriaLabelsEs[data.galeria] }],
    },
    {
      title: "8. MEJORAS DE EFICIENCIA TÉRMICA",
      rows: [
        { label: "Paneles de pared 100mm", value: siNo(data.mejoraParedes100) },
        { label: "Triple vidrio", value: siNo(data.mejoraTripleVidrio) },
        { label: "Techo panel sándwich", value: siNo(data.mejoraTechoSandwich) },
      ],
    },
    {
      title: "9. ACABADOS Y DISEÑO",
      rows: [
        {
          label: "Color de paredes interiores",
          value: paredInteriorColorLabelsEs[data.paredInteriorColor],
        },
        {
          label: "Revestimiento interior",
          value: paredInteriorRevestimientoLabelsEs[data.paredInteriorRevestimiento],
        },
        {
          label: "Color exterior",
          value: paredExteriorColorLabelsEs[data.paredExteriorColor],
        },
        {
          label: "Revestimiento exterior",
          value: paredExteriorRevestimientoLabelsEs[data.paredExteriorRevestimiento],
        },
        {
          label: "Revestimiento de paredes baño",
          value: banoRevestimientoLabelsEs[data.banoRevestimiento],
        },
        {
          label: "Color de sanitarios",
          value: banoColorSanitariosLabelsEs[data.banoColorSanitarios],
        },
        {
          label: "Revestimiento de paredes cocina",
          value: cocinaRevestimientoLabelsEs[data.cocinaRevestimiento],
        },
        {
          label: "Color de muebles de cocina",
          value: cocinaColorMueblesLabelsEs[data.cocinaColorMuebles],
        },
      ],
    },
    {
      title: "10. PUERTAS Y ABERTURAS",
      rows: [
        {
          label: "Puerta principal — tipo",
          value: puertaPrincipalTipoLabelsEs[data.puertaPrincipalTipo],
        },
        {
          label: "Puerta principal — material",
          value: puertaPrincipalMaterialLabelsEs[data.puertaPrincipalMaterial],
        },
        {
          label: "Puerta principal — color",
          value: puertaPrincipalColorLabelsEs[data.puertaPrincipalColor],
        },
        {
          label: "Puerta interior — tipo",
          value: puertaInteriorTipoLabelsEs[data.puertaInteriorTipo],
        },
        {
          label: "Puerta interior — color",
          value: puertaInteriorColorLabelsEs[data.puertaInteriorColor],
        },
        { label: "Tipo de abertura", value: ventanaTipoLabelsEs[data.ventanaTipo] },
      ],
      note: "Las ventanas incluyen DVH (doble vidrio hermético) y mosquitero en todos los tipos.",
    },
  ];
}
