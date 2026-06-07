export type ModelCategory = "familiar" | "turistico" | "oficina";

export type ModelImage = {
  gradient: string;
  label: string;
  accent: string;
};

export type ModelSpecs = {
  estructura: string;
  cubierta: string;
  cerramiento: string;
  aislacion: string;
  instalaciones: string;
  terminaciones: string;
  tiempo: string;
  garantia: string;
};

export type ProductModel = {
  slug: string;
  name: string;
  category: ModelCategory;
  tagline: string;
  description: string;
  size: number;
  rooms: number;
  baths: number;
  priceUSD: number;
  tag?: string;
  features: string[];
  specs: ModelSpecs;
  images: ModelImage[];
  floorPlanSize: "small" | "medium" | "large" | "xl";
};

export const CATEGORY_LABELS: Record<ModelCategory, string> = {
  familiar: "Vivienda familiar",
  turistico: "Alquiler turístico",
  oficina: "Oficina en casa",
};

const IMGS = {
  warm: (label: string): ModelImage[] => [
    { gradient: "from-stone-700 via-stone-800 to-stone-950", label: "Vista exterior", accent: "#d97706" },
    { gradient: "from-amber-900/50 via-stone-800 to-stone-900", label: "Sala de estar", accent: "#f59e0b" },
    { gradient: "from-stone-600 to-stone-900", label: "Cocina y comedor", accent: "#92400e" },
    { gradient: "from-stone-700 to-stone-800", label: `${label}`, accent: "#78716c" },
  ],
  cool: (label: string): ModelImage[] => [
    { gradient: "from-stone-800 via-stone-900 to-stone-950", label: "Vista exterior", accent: "#6ee7b7" },
    { gradient: "from-emerald-900/40 via-stone-800 to-stone-900", label: "Interior principal", accent: "#34d399" },
    { gradient: "from-stone-700 to-stone-900", label: "Baño y servicios", accent: "#6ee7b7" },
    { gradient: "from-stone-600 to-stone-800", label: `${label}`, accent: "#78716c" },
  ],
  neutral: (label: string): ModelImage[] => [
    { gradient: "from-slate-700 via-stone-800 to-stone-950", label: "Vista exterior", accent: "#94a3b8" },
    { gradient: "from-slate-800 via-stone-800 to-stone-900", label: "Espacio de trabajo", accent: "#cbd5e1" },
    { gradient: "from-stone-600 to-stone-900", label: "Baño y kitchenette", accent: "#94a3b8" },
    { gradient: "from-stone-700 to-stone-800", label: `${label}`, accent: "#78716c" },
  ],
};

const SPECS_FAMILIAR: ModelSpecs = {
  estructura: "Steel frame galvanizado 90 mm",
  cubierta: "Chapa Lysaght prepintada + membrana asfáltica",
  cerramiento: "Panel SIP 150 mm (EPS de alta densidad)",
  aislacion: "Lana de roca 50 mm + barrera de vapor",
  instalaciones: "Eléctrica, sanitaria, gas natural/GLP",
  terminaciones: "Piso vinílico SPC, pintura látex premium",
  tiempo: "60–90 días desde aprobación",
  garantia: "5 años estructura · 2 años cubierta",
};

const SPECS_TURISTICO: ModelSpecs = {
  estructura: "Steel frame galvanizado 70 mm",
  cubierta: "Deck metálico + membrana EPDM",
  cerramiento: "Panel SIP 100 mm",
  aislacion: "Poliestireno expandido 80 mm",
  instalaciones: "Eléctrica, sanitaria, split de calefacción",
  terminaciones: "Deck de madera, revestimiento de madera terciada",
  tiempo: "45–75 días desde aprobación",
  garantia: "5 años estructura · 2 años cubierta",
};

const SPECS_OFICINA: ModelSpecs = {
  estructura: "Steel frame galvanizado 70 mm",
  cubierta: "Chapa acanalada + skylight opcional",
  cerramiento: "Panel SIP 100 mm + doble vidriado hermético",
  aislacion: "Lana de vidrio 50 mm + barrera de vapor",
  instalaciones: "Eléctrica trifásica, datos CAT6, split inverter",
  terminaciones: "Piso flotante laminado, pintura antihumedad",
  tiempo: "30–60 días desde aprobación",
  garantia: "5 años estructura · 2 años cubierta",
};

export const MODELS: ProductModel[] = [
  // ── FAMILIAR ──────────────────────────────────────────────
  {
    slug: "familiar-65",
    name: "Familiar 65",
    category: "familiar",
    tag: "Más elegido",
    tagline: "El punto de partida ideal para tu familia",
    description:
      "El Familiar 65 es nuestro modelo más popular. Tres ambientes bien pensados, cocina integrada al comedor y dos baños completos. Diseñado para familias que quieren confort sin complicaciones, con todos los materiales certificados y entrega en 60 días.",
    size: 65,
    rooms: 3,
    baths: 2,
    priceUSD: 34500,
    features: [
      "Ventilación cruzada en todos los ambientes",
      "Cocina-comedor integrado de 20 m²",
      "Suite principal con baño en suite",
      "Galería techada de 8 m² incluida",
      "Pre-instalación de aire acondicionado",
      "Habilitación municipal gestionada",
    ],
    specs: SPECS_FAMILIAR,
    images: IMGS.warm("Dormitorio principal"),
    floorPlanSize: "medium",
  },
  {
    slug: "familiar-90",
    name: "Familiar 90",
    category: "familiar",
    tagline: "Espacio y comodidad para toda la familia",
    description:
      "El Familiar 90 suma un cuarto ambiente y más espacio en living-comedor. Ideal para familias con hijos o quienes trabajan desde casa y necesitan un ambiente extra. Dos baños completos y una galería amplia.",
    size: 90,
    rooms: 4,
    baths: 2,
    priceUSD: 48900,
    features: [
      "Cuatro ambientes independientes",
      "Living-comedor de 28 m²",
      "Galería de 12 m² con techo de chapa",
      "Suite principal con walk-in closet",
      "Cocina semi-abierta con isla",
      "Pre-instalación solar fotovoltaica",
    ],
    specs: SPECS_FAMILIAR,
    images: IMGS.warm("Galería exterior"),
    floorPlanSize: "large",
  },
  {
    slug: "premium-95",
    name: "Premium 95",
    category: "familiar",
    tag: "Premium",
    tagline: "Diseño premium y máximo confort",
    description:
      "El modelo Premium 95 eleva el estándar con terminaciones de primera línea: piso de porcelanato grande, mesada de granito y aberturas de aluminio con doble vidriado. Cuatro ambientes amplios y una propuesta estética que no pasa desapercibida.",
    size: 95,
    rooms: 4,
    baths: 2,
    priceUSD: 52000,
    features: [
      "Terminaciones de línea premium",
      "Piso de porcelanato grande formato",
      "Mesada de granito en cocina y baños",
      "Aberturas de aluminio DVH",
      "Deck perimetral de madera",
      "Sistema domótico de iluminación",
    ],
    specs: { ...SPECS_FAMILIAR, terminaciones: "Porcelanato 60×60, mesada de granito, aluminio premium" },
    images: IMGS.warm("Deck exterior"),
    floorPlanSize: "large",
  },
  {
    slug: "familiar-120",
    name: "Familiar 120",
    category: "familiar",
    tag: "Gran familia",
    tagline: "La casa grande que siempre soñaste",
    description:
      "Para familias numerosas o quienes buscan espacio de sobra. Cinco ambientes, tres baños, sala de estar separada del living y cocina de 18 m². La opción más completa de la línea familiar, con posibilidad de incorporar pileta modular.",
    size: 120,
    rooms: 5,
    baths: 3,
    priceUSD: 68000,
    features: [
      "Cinco ambientes + sala de estar",
      "Tres baños completos",
      "Cocina profesional de 18 m²",
      "Galería de 15 m² con quincho",
      "Lavadero independiente",
      "Posibilidad de pileta modular",
    ],
    specs: { ...SPECS_FAMILIAR, estructura: "Steel frame galvanizado 120 mm" },
    images: IMGS.warm("Quincho exterior"),
    floorPlanSize: "xl",
  },

  // ── TURÍSTICO ─────────────────────────────────────────────
  {
    slug: "studio-35",
    name: "Studio 35",
    category: "turistico",
    tag: "Ideal inversión",
    tagline: "Máxima rentabilidad en mínimo espacio",
    description:
      "El Studio 35 está diseñado para inversores que quieren maximizar la rentabilidad. Un ambiente funcional con cocina integrada, baño completo y deck externo. Perfecto para la costa, la montaña o zonas de alquiler temporario.",
    size: 35,
    rooms: 1,
    baths: 1,
    priceUSD: 18900,
    features: [
      "Amortización en 2 temporadas promedio",
      "Deck externo de 12 m²",
      "Cocina integrada con barra americana",
      "Baño con ducha tipo spa",
      "Entrega lista para equipar",
      "Diseño pensado para Airbnb",
    ],
    specs: SPECS_TURISTICO,
    images: IMGS.cool("Vista del deck"),
    floorPlanSize: "small",
  },
  {
    slug: "cabana-55",
    name: "Cabaña 55",
    category: "turistico",
    tagline: "Escapada perfecta para dos o cuatro personas",
    description:
      "La Cabaña 55 ofrece un dormitorio separado con cama matrimonial, zona de estar con sofá-cama y baño completo. Ideal para parejas o grupos pequeños. El revestimiento de madera y el deck con vista la convierten en la opción más buscada en zonas de montaña.",
    size: 55,
    rooms: 2,
    baths: 1,
    priceUSD: 27500,
    features: [
      "Dormitorio separado + zona de estar",
      "Revestimiento exterior de madera",
      "Deck panorámico de 16 m²",
      "Cocina-comedor integrado",
      "Estufa a leña incluida",
      "Ideal para montaña y lagos",
    ],
    specs: { ...SPECS_TURISTICO, terminaciones: "Madera de pino tratado, deck de quebracho" },
    images: IMGS.cool("Deck panorámico"),
    floorPlanSize: "medium",
  },
  {
    slug: "duplex-75",
    name: "Dúplex 75",
    category: "turistico",
    tag: "Mayor rentabilidad",
    tagline: "Dos unidades independientes para duplicar ingresos",
    description:
      "El Dúplex 75 es una estructura que aloja dos unidades independientes de 37 m² cada una. Ideal para maximizar la rentabilidad en un solo lote: dos contratos simultáneos, una sola construcción. Muy solicitado en zonas de alta demanda turística.",
    size: 75,
    rooms: 3,
    baths: 2,
    priceUSD: 39000,
    features: [
      "Dos unidades independientes (37 m² c/u)",
      "Entradas separadas para cada unidad",
      "Dos medidores eléctricos independientes",
      "Ingreso simultáneo de dos huéspedes",
      "Gestión de Airbnb facilitada",
      "Máxima rentabilidad por m² construido",
    ],
    specs: SPECS_TURISTICO,
    images: IMGS.cool("Vista desde la calle"),
    floorPlanSize: "large",
  },

  // ── OFICINA ───────────────────────────────────────────────
  {
    slug: "oficina-20",
    name: "Oficina 20",
    category: "oficina",
    tagline: "Tu espacio de trabajo en 30 días",
    description:
      "Un espacio de trabajo compacto y funcional para instalar en el jardín. Open space con escritorio integrado, iluminación cenital y baño de cortesía. La solución más rápida para separar el trabajo del hogar.",
    size: 20,
    rooms: 1,
    baths: 1,
    priceUSD: 12500,
    features: [
      "Open space de 16 m² de trabajo neto",
      "Iluminación cenital (skylight)",
      "Escritorio flotante integrado",
      "Baño de cortesía incluido",
      "Doble vidriado hermético",
      "Climatización con split inverter",
    ],
    specs: SPECS_OFICINA,
    images: IMGS.neutral("Escritorio principal"),
    floorPlanSize: "small",
  },
  {
    slug: "oficina-35",
    name: "Oficina 35",
    category: "oficina",
    tagline: "Trabajo individual y reuniones, sin salir de casa",
    description:
      "La Oficina 35 incorpora una zona de trabajo privada y una sala de reuniones para 4 personas. Conexión de datos CAT6, sistema de videoconferencia y baño completo. Ideal para profesionales que reciben clientes.",
    size: 35,
    rooms: 2,
    baths: 1,
    priceUSD: 18500,
    features: [
      "Zona de trabajo + sala de reuniones",
      "Sala para hasta 6 personas",
      "Conexión de datos CAT6 certificada",
      "Pared de vidrio interior",
      "Kitchenette con cafetera empotrada",
      "Baño completo para clientes",
    ],
    specs: SPECS_OFICINA,
    images: IMGS.neutral("Sala de reuniones"),
    floorPlanSize: "medium",
  },
  {
    slug: "home-studio-45",
    name: "Home Studio 45",
    category: "oficina",
    tag: "Más completo",
    tagline: "Estudio profesional en tu propiedad",
    description:
      "El Home Studio 45 es la versión más equipada: estudio principal, sala de reuniones, kitchenette y baño completo con ducha. Diseñado para freelancers, arquitectos, psicólogos y cualquier profesional que necesite un espacio de primer nivel.",
    size: 45,
    rooms: 2,
    baths: 1,
    priceUSD: 23000,
    features: [
      "Estudio de 28 m² con luz cenital",
      "Sala de reuniones independiente",
      "Baño completo con ducha",
      "Kitchenette equipada",
      "Piso elevado para cables bajo piso",
      "Aislación acústica certificada",
    ],
    specs: { ...SPECS_OFICINA, aislacion: "Lana de roca 80 mm + aislación acústica certificada" },
    images: IMGS.neutral("Estudio principal"),
    floorPlanSize: "medium",
  },
];

export function getModel(slug: string): ProductModel | undefined {
  return MODELS.find((m) => m.slug === slug);
}

export function getModelsByCategory(category: ModelCategory | "all"): ProductModel[] {
  if (category === "all") return MODELS;
  return MODELS.filter((m) => m.category === category);
}
