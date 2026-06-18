export type RegionalModel = {
  key: string;
  nombre: string;
  icon: string;
  region: string;
  tagline: string;
  descripcion: string;
  panel: string;
  ventanas: string;
  climatizacion: string;
  extras: string[];
  precioMin: number;
  precioMax: number;
};

export const REGIONAL_MODELS: Record<string, RegionalModel> = {
  iguazu: {
    key: "iguazu",
    nombre: "Iguazú",
    icon: "🌿",
    region: "Mesopotamia Húmeda",
    tagline: "Diseñado para el calor y la humedad del litoral",
    descripcion:
      "Optimizado para la alta humedad y temperaturas de Mesopotamia. Panel PU antihongos, doble vidriado PVC y ventilación mecánica controlada para eliminar condensación y mantener el confort todo el año.",
    panel: "Panel 75 mm poliuretano (PU)",
    ventanas: "DVH PVC antitérmico",
    climatizacion: "Split inverter modo dry + VMC",
    extras: [
      "Barrera antivapor clase 4",
      "Cubierta ventilada antihongos",
      "Sellados perimetrales estanco",
      "Aleros 80 cm perimetrales",
    ],
    precioMin: 18000,
    precioMax: 26000,
  },
  impenetrable: {
    key: "impenetrable",
    nombre: "Impenetrable",
    icon: "🌡️",
    region: "Gran Chaco",
    tagline: "Ingeniería contra los veranos más extremos del país",
    descripcion:
      "Para las zonas de mayor temperatura de Argentina. Aislación termorradiante bajo cubierta, parasoles y ventilación cruzada forzada que reducen la temperatura interior hasta 12°C.",
    panel: "Panel 75 mm EPS + manta termorradiante",
    ventanas: "DVH aluminio rompecorriente + parasoles fijos",
    climatizacion: "Split inverter alta eficiencia (COP ≥ 4) + ventilación cruzada",
    extras: [
      "Aleros perimetrales 1 m",
      "Cubierta de alta reflectancia solar",
      "Piso elevado + ventilación bajo solado",
      "Pintura exterior termorradiante",
    ],
    precioMin: 19000,
    precioMax: 27000,
  },
  pampa: {
    key: "pampa",
    nombre: "Pampa",
    icon: "🌾",
    region: "Llanura Pampeana",
    tagline: "El estándar de confort para el clima más equilibrado",
    descripcion:
      "Clima templado con cuatro estaciones marcadas. Modelo de referencia MOVARA: aislación balanceada, aberturas amplias para el sol de invierno y ventilación natural en verano.",
    panel: "Panel SIP 100 mm EPS",
    ventanas: "DVH aluminio estándar",
    climatizacion: "Split inverter + instalación gas natural",
    extras: [
      "Barrera de vapor clase 2",
      "Galería orientada al norte incluida",
      "Pre-instalación solar fotovoltaica",
      "Zócalo perimetral estanco",
    ],
    precioMin: 17000,
    precioMax: 24000,
  },
  zonda: {
    key: "zonda",
    nombre: "Zonda",
    icon: "🏜️",
    region: "Cuyo Árido",
    tagline: "Contra el viento y la amplitud térmica de Cuyo",
    descripcion:
      "Diseñado para la amplitud térmica extrema y el viento Zonda. Sellados extra, doble vidriado con protección UV y calefacción radiante para los inviernos secos y fríos.",
    panel: "Panel 100 mm EPS + barrera de vapor reforzada",
    ventanas: "DVH aluminio rompecorriente + filtro UV",
    climatizacion: "Split inverter + losa radiante eléctrica",
    extras: [
      "Sellados perimetrales anti-polvo y viento",
      "Protección UV en aberturas",
      "Membrana impermeabilizante anti-UV",
      "Cisterna enterrada 2.000 L",
    ],
    precioMin: 18000,
    precioMax: 25000,
  },
  kolla: {
    key: "kolla",
    nombre: "Kolla",
    icon: "⛰️",
    region: "NOA Andino",
    tagline: "Altura y amplitud térmica: confort en el NOA",
    descripcion:
      "Adaptado para la puna y los valles del NOA. Gran amplitud térmica diaria, radiación UV intensa y temporada de lluvias. Aislación para noches frías y protección contra el sol de altura.",
    panel: "Panel 100 mm EPS + revestimiento anti-UV",
    ventanas: "DVH aluminio con lámina control solar UV",
    climatizacion: "Split inverter + calefactor a gas/GLP",
    extras: [
      "Cubierta impermeabilizada para lluvias estivales",
      "Protección solar con persianas externas",
      "Cisterna 2.500 L (provisión irregular)",
      "Estructura para terrenos en pendiente",
    ],
    precioMin: 22000,
    precioMax: 32000,
  },
  tehuelche: {
    key: "tehuelche",
    nombre: "Tehuelche",
    icon: "💨",
    region: "Patagonia Esteparia",
    tagline: "Para el frío y el viento patagónico",
    descripcion:
      "La Patagonia exige lo mejor en aislación y resistencia al viento. Panel de 150 mm, estructura reforzada para ráfagas y calefacción central para los inviernos más fríos.",
    panel: "Panel 150 mm EPS alta densidad",
    ventanas: "DVH aluminio rompecorriente térmico",
    climatizacion: "Calefacción central a gas + split inverter",
    extras: [
      "Estructura reforzada vientos 180 km/h",
      "Cubierta 2 aguas pendiente 30°",
      "Umbral térmico en puertas de acceso",
      "Barrera cortaviento perimetral",
    ],
    precioMin: 21000,
    precioMax: 30000,
  },
  pehuen: {
    key: "pehuen",
    nombre: "Pehuén",
    icon: "❄️",
    region: "Andes Patagónicos",
    tagline: "La solución andina para Bariloche, San Martín y Esquel",
    descripcion:
      "La cordillera patagónica suma nevada, lluvia intensa y frío extremo. Triple vidriado, panel PU de 150 mm y cubierta reforzada para carga de nieve. El más completo de la línea.",
    panel: "Panel 150 mm poliuretano (PU)",
    ventanas: "Triple vidriado hermético PVC",
    climatizacion: "Piso radiante eléctrico + split inverter",
    extras: [
      "Cubierta reforzada nieve (150 kg/m²)",
      "Revestimiento exterior fibrocemento tratado",
      "Cubierta 2 aguas 45° evacuación de nieve",
      "Barrera de vapor de alta performance",
    ],
    precioMin: 25000,
    precioMax: 38000,
  },
  yagan: {
    key: "yagan",
    nombre: "Yagán",
    icon: "🧊",
    region: "Tierra del Fuego",
    tagline: "El módulo más aislado para el fin del mundo",
    descripcion:
      "Tierra del Fuego impone las condiciones más extremas de Argentina. El Yagán ofrece 200 mm de PU, triple vidriado PVC y calefacción de alto rendimiento para temperaturas bajo cero.",
    panel: "Panel 200 mm poliuretano (PU) alta densidad",
    ventanas: "Triple vidriado PVC (Uw ≤ 1,0 W/m²K)",
    climatizacion: "Calefacción geotérmica / piso radiante + recuperador de calor",
    extras: [
      "Estructura reforzada nieve + viento 200 km/h",
      "Aislación XPS 100 mm bajo solado",
      "Cubierta 2 aguas 45° chapa prepintada",
      "Vestíbulo térmico de entrada incluido",
    ],
    precioMin: 28000,
    precioMax: 42000,
  },
};

export const PROVINCIA_A_MODELO: Record<string, string> = {
  "Buenos Aires": "pampa",
  "Ciudad Autónoma de Buenos Aires": "pampa",
  "Santa Fe": "pampa",
  "Córdoba": "pampa",
  "La Pampa": "pampa",
  "Entre Ríos": "iguazu",
  "Corrientes": "iguazu",
  "Misiones": "iguazu",
  "Formosa": "impenetrable",
  "Chaco": "impenetrable",
  "Santiago del Estero": "impenetrable",
  "Tucumán": "kolla",
  "Salta": "kolla",
  "Jujuy": "kolla",
  "Catamarca": "kolla",
  "La Rioja": "zonda",
  "San Juan": "zonda",
  "Mendoza": "zonda",
  "San Luis": "zonda",
  "Neuquén": "tehuelche",
  "Río Negro": "tehuelche",
  "Chubut": "tehuelche",
  "Santa Cruz": "tehuelche",
  "Tierra del Fuego": "yagan",
};

export const PEHUEN_PROVINCIAS = ["Río Negro", "Neuquén", "Chubut"];

export const PEHUEN_LOCALIDADES = [
  "bariloche",
  "san carlos de bariloche",
  "san martín de los andes",
  "san martin de los andes",
  "esquel",
  "villa la angostura",
];

export function getModeloKey(provincia: string, localidad?: string): string {
  if (localidad && PEHUEN_PROVINCIAS.includes(provincia)) {
    const loc = localidad.toLowerCase().trim();
    if (PEHUEN_LOCALIDADES.some((l) => loc.includes(l))) return "pehuen";
  }
  return PROVINCIA_A_MODELO[provincia] ?? "pampa";
}

export const PROVINCIAS_AR: string[] = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];
