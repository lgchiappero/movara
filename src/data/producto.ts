export type ProductoResultado = {
  label: string;
  valorLabel: string;
  limiteLabel: string;
  /** Fracción del límite normativo utilizada (0–1). Cuanto más baja, más margen. */
  fraccion: number;
  mejora?: string;
};

export type ProductoGrupoLista = {
  tipo: "lista";
  id: string;
  titulo: string;
  items: string[];
};

export type ProductoGrupoTabla = {
  tipo: "tabla";
  id: string;
  titulo: string;
  columnas: string[];
  filas: string[][];
};

export type ProductoGrupoBarras = {
  tipo: "barras";
  id: string;
  titulo: string;
  items: ProductoResultado[];
};

export type ProductoGrupo = ProductoGrupoLista | ProductoGrupoTabla | ProductoGrupoBarras;

export type ProductoSeccion = {
  numero: string;
  titulo: string;
  descripcion: string;
  beneficios: string[];
  grupos: ProductoGrupo[];
};

export const PRODUCTO_SECCIONES: ProductoSeccion[] = [
  {
    numero: "01",
    titulo: "La estructura",
    descripcion:
      "MOVARA Flex está construida con acero galvanizado Q235B — el mismo tipo de acero que se usa en puentes y construcción civil. No es aluminio, no es madera, no es un container reciclado. Es acero nuevo, fabricado específicamente para ser una vivienda.",
    beneficios: [
      "No se oxida, no se pudre, no la comen las termitas",
      "No necesita mantenimiento",
      "Garantía MOVARA de 12 meses sobre la estructura",
    ],
    grupos: [],
  },
  {
    numero: "02",
    titulo: "Las paredes",
    descripcion:
      "Las paredes de MOVARA tienen lana de roca de 75mm. No es telgopor, no es espuma. Es el mismo material que se usa en industrias donde el fuego y el ruido son un problema real.",
    beneficios: [
      "En invierno el calor que generás adentro se queda adentro",
      "En verano el calor de afuera no entra",
      "Si hay un incendio la pared no arde ni genera humo tóxico — Clase A1",
      "Mejor aislación acústica que una pared de ladrillos estándar",
    ],
    grupos: [],
  },
  {
    numero: "03",
    titulo: "El techo",
    descripcion:
      "El techo es un panel sándwich de poliuretano — una sola pieza que aísla, impermeabiliza y no necesita nada más encima. Sin isolant, sin cielorrazo aparte, sin etapas.",
    beneficios: [
      "No hay goteras — impermeabilización de 5 capas de fábrica",
      "No hay condensación en el cielorrazo en invierno",
      "Aísla casi el doble que un techo con isolant estándar",
      "No necesitás llamar a nadie para mantenimiento",
    ],
    grupos: [],
  },
  {
    numero: "04",
    titulo: "Las ventanas",
    descripcion:
      "Doble vidrio hermético con rotura de puente térmico. Es la tecnología que usan los edificios premium en Buenos Aires y Europa.",
    beneficios: [
      "No hay condensación en el vidrio en invierno",
      "El frío no entra por el marco",
      "El ruido de afuera se reduce notablemente",
      "Mosquiteros incluidos en todas las aberturas",
    ],
    grupos: [],
  },
  {
    numero: "05",
    titulo: "El baño y la cocina",
    descripcion:
      "Vienen instalados de fábrica. No es preparado para. Es el baño terminado, con inodoro, lavabo, espejo, ducha, paneles de pared y puerta. La cocina con muebles, mesada, pileta y grifo.",
    beneficios: [
      "El día que llega la MOVARA a tu terreno, podés bañarte. No esperás al plomero, no esperás al ceramista, no esperás a nadie.",
    ],
    grupos: [],
  },
  {
    numero: "06",
    titulo: "El sistema eléctrico",
    descripcion:
      "220V 50Hz estándar argentino. Tablero con protección diferencial, iluminación LED, tomacorrientes en todos los ambientes.",
    beneficios: [
      "Conectás a la red con un electricista matriculado y listo. No hay que adaptar nada ni comprar transformadores.",
    ],
    grupos: [],
  },
  {
    numero: "07",
    titulo: "El agua caliente",
    descripcion: "Calefón eléctrico instantáneo incluido. Conecta cocina y baño desde el primer día.",
    beneficios: [],
    grupos: [],
  },
  {
    numero: "08",
    titulo: "Los tiempos",
    descripcion:
      "Desde que confirmás el pedido con el anticipo hasta que tu MOVARA está instalada en tu terreno: entre 90 y 120 días. El plazo puede variar según condiciones logísticas o aduaneras. Te mantenemos informado en todo momento.",
    beneficios: [],
    grupos: [],
  },
  {
    numero: "09",
    titulo: "La garantía",
    descripcion:
      "12 meses de garantía MOVARA sobre la estructura y los componentes principales. Por escrito, desde el primer día.",
    beneficios: [],
    grupos: [],
  },
];

export type ProductoExtra = {
  texto: string;
  precio: string;
};

export const PRODUCTO_EXTRAS: ProductoExtra[] = [
  { texto: "Terraza cubierta 2m con tarima, barandas y techo", precio: "+USD 1.600" },
  { texto: "Galería perimetral con techo", precio: "Consultar" },
  { texto: "Techo a dos aguas", precio: "Consultar" },
  { texto: "Pared de vidrio (muro cortina)", precio: "Consultar" },
  { texto: "Inodoro inteligente con bidet", precio: "+USD 300" },
  { texto: "Piso SPC 4mm en lugar de PVC", precio: "+USD 240" },
  { texto: "Panel de fachada metálico tallado", precio: "+USD 500" },
  { texto: "Pre-instalación lavarropas", precio: "Consultar" },
  { texto: "Kit solar completo", precio: "Consultar" },
];
