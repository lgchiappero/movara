// Catálogo estático del configurador — extraído de ConfiguradorMovara.tsx
// ("use client") para que el panel admin y el generador de PDF (ambos
// server-side) puedan resolver modelo/finalidad/upgrades a texto legible
// sin importar el componente de UI completo.

export const MOVARA_MODELS = [
  {
    key: "10ft" as const,
    nombre: "MOVARA Flex 18",
    superficie: 18,
    tagline: "Studio, espacio mínimo o módulo independiente",
    maxHab: 1,
  },
  {
    key: "20ft" as const,
    nombre: "MOVARA Flex 38",
    superficie: 38,
    tagline: "El más versátil — 1 o 2 ambientes",
    maxHab: 2,
    badge: "Más elegido",
  },
  {
    key: "40ft" as const,
    nombre: "MOVARA Flex 77",
    superficie: 77,
    tagline: "Máximo espacio — familia o inversión grande",
    maxHab: 3,
  },
] as const;

export type ModeloKey = (typeof MOVARA_MODELS)[number]["key"];

export const FINALIDADES = [
  { key: "inversor", emoji: "💰", label: "Inversor", desc: "Transformá capital en renta, sin años de obra", subdesc: "Airbnb, renta, glamping" },
  { key: "agro", emoji: "🌾", label: "Agro / Campo", desc: "Infraestructura lista para tu campo, sin meses de obra", subdesc: "Vivienda o infraestructura rural" },
  { key: "vivienda", emoji: "🏠", label: "Primera vivienda", desc: "Una nueva forma de habitar", subdesc: "Tu hogar propio" },
  { key: "turismo", emoji: "🏕️", label: "Turismo y hospitalidad", desc: "Eco resort, glamping o expansión rápida", subdesc: "Eco resort, glamping" },
  { key: "empresa", emoji: "💼", label: "Empresa / B2B", desc: "Oficinas, campamentos o infraestructura corporativa", subdesc: "Corporativo o industrial" },
  { key: "sector-publico", emoji: "🏛️", label: "Sector público", desc: "Vivienda social o infraestructura municipal", subdesc: "Municipal o social" },
] as const;

export type FinalidadKey = (typeof FINALIDADES)[number]["key"];

export type Upgrade = {
  key: string;
  icon: string;
  nombre: string;
  descripcion: string;
  recomendado?: boolean;
  soloModelos?: string[];
};

export const UNIVERSAL_UPGRADES: Upgrade[] = [
  {
    key: "panel-100",
    icon: "🧱",
    nombre: "Panel lana de roca 100mm",
    descripcion: "Valor R: 2.8 m²K/W — 33% más que el estándar 75mm. Mantiene temperatura interior estable hasta −15°C exterior. Recomendado para Patagonia, Cordillera, NOA y TDF.",
  },
  {
    key: "triple-vidrio",
    icon: "🪟",
    nombre: "Triple vidrio (TDH)",
    descripcion: "Transmitancia: 0.5–0.7 W/m²K vs DVH estándar 1.0–1.2 W/m²K — 50% más eficiente. Elimina condensación incluso en invierno extremo.",
  },
  {
    key: "balcon-delantero",
    icon: "🏗️",
    nombre: "Balcón delantero",
    descripcion: "Amplía el espacio exterior habitable. Disponible para todos los modelos. Ideal para uso turístico y vivienda.",
  },
  {
    key: "balcon-lateral",
    icon: "🏗️",
    nombre: "Balcón lateral",
    descripcion: "Espacio exterior de acceso lateral. Solo disponible para modelos 20ft y 40ft (superficie mayor a 18m²).",
    soloModelos: ["20ft", "40ft"],
  },
  {
    key: "kit-solar",
    icon: "⚡",
    nombre: "Kit solar básico",
    descripcion: "2 paneles 400W + inversor. Reducción estimada de factura eléctrica: 40–60%. Disponible para todos los modelos.",
  },
];

export const UPGRADES_BY_REGION: Record<string, Upgrade[]> = {
  pampa: [
    { key: "pu75", icon: "🧱", nombre: "Panel PU 75mm", descripcion: "Mejor aislación térmica para los inviernos y veranos de la llanura pampeana", recomendado: true },
    { key: "dvh", icon: "🪟", nombre: "DVH doble vidrio", descripcion: "Reduce pérdida de calor en 50% y elimina condensación en ventanas", recomendado: true },
    { key: "split", icon: "❄️", nombre: "Split inverter frío/calor", descripcion: "Climatización eficiente para las 4 estaciones de la zona pampeana" },
  ],
  impenetrable: [
    { key: "techo-ventilado", icon: "☀️", nombre: "Techo ventilado reflectivo", descripcion: "Reduce hasta 12°C la temperatura interior en los veranos extremos del Chaco", recomendado: true },
    { key: "pintura-termo", icon: "🎨", nombre: "Pintura termorreflejante", descripcion: "Refleja la radiación solar y reduce el consumo de aire acondicionado", recomendado: true },
    { key: "solar", icon: "⚡", nombre: "Paneles solares", descripcion: "Aprovechá la alta irradiación solar del norte con generación propia" },
    { key: "filtros", icon: "🌫️", nombre: "Filtros anti-polvo", descripcion: "Protección para ventilación y equipment en zonas con vientos de tierra" },
  ],
  iguazu: [
    { key: "vmc", icon: "💨", nombre: "VMC — Ventilación mecánica", descripcion: "Controla humedad y evita condensación en el clima húmedo de Mesopotamia", recomendado: true },
    { key: "barrera-vapor", icon: "💧", nombre: "Barrera de vapor reforzada", descripcion: "Protege la estructura de la humedad extrema del litoral", recomendado: true },
    { key: "pintura-anti", icon: "🛡️", nombre: "Pintura anticorrosiva", descripcion: "Protección extra para estructuras metálicas en ambientes húmedos" },
  ],
  zonda: [
    { key: "anclaje", icon: "⚓", nombre: "Anclaje anti-vuelco M16", descripcion: "Anclaje reforzado para resistir el viento Zonda de hasta 180 km/h", recomendado: true },
    { key: "epdm", icon: "🔒", nombre: "Sellado EPDM perimetral", descripcion: "Sello especial anti-polvo y anti-viento para los vientos áridos de Cuyo" },
    { key: "solar-cuyo", icon: "⚡", nombre: "Paneles solares", descripcion: "Alta irradiación solar en Cuyo: ideal para generación fotovoltaica propia", recomendado: true },
  ],
  kolla: [
    { key: "pu100-noa", icon: "🧱", nombre: "Panel PU 100mm", descripcion: "Aislación superior para la gran amplitud térmica diaria del NOA andino", recomendado: true },
    { key: "aluminio", icon: "✨", nombre: "Aluminio anodizado", descripcion: "Protección contra la radiación UV intensa de la altura y el clima seco" },
    { key: "solar-off-grid", icon: "🔋", nombre: "Sistema solar off-grid completo", descripcion: "Autonomía energética para zonas con provisión eléctrica irregular", recomendado: true },
  ],
  tehuelche: [
    { key: "pu100-pat", icon: "🧱", nombre: "Panel PU 100mm", descripcion: "Aislación reforzada para los inviernos fríos de la estepa patagónica", recomendado: true },
    { key: "triple-teh", icon: "🪟", nombre: "Triple vidrio", descripcion: "Aislación térmica máxima para temperaturas bajo cero y vientos intensos", recomendado: true },
    { key: "anclaje-pat", icon: "⚓", nombre: "Anclaje reforzado", descripcion: "Estructura preparada para ráfagas de hasta 180 km/h en la Patagonia" },
  ],
  pehuen: [
    { key: "techo-aguas", icon: "🏔️", nombre: "Techo a dos aguas", descripcion: "Pendiente 45° para evacuación eficiente de nieve — imprescindible en cordillera", recomendado: true },
    { key: "madera", icon: "🌲", nombre: "Revestimiento en madera", descripcion: "Estética andina y aislación natural extra para el clima cordillerano" },
    { key: "triple-peh", icon: "🪟", nombre: "Triple vidrio PVC", descripcion: "Máxima aislación para los inviernos más fríos y nevosos de los Andes", recomendado: true },
  ],
  yagan: [
    { key: "pu120", icon: "🧱", nombre: "Panel PU 120mm", descripcion: "La mayor aislación disponible — imprescindible para Tierra del Fuego", recomendado: true },
    { key: "triple-yag", icon: "🪟", nombre: "Triple vidrio hermético", descripcion: "Elimina pérdidas de calor y condensación en temperaturas extremas", recomendado: true },
    { key: "calefaccion", icon: "🔥", nombre: "Calefacción central", descripcion: "Sistema de calefacción de alto rendimiento para inviernos bajo cero" },
  ],
};

export function findUpgrade(regionalKey: string, key: string): Upgrade | undefined {
  const all = [...UNIVERSAL_UPGRADES, ...(UPGRADES_BY_REGION[regionalKey] ?? [])];
  return all.find((u) => u.key === key);
}
