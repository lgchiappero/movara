// Catálogo de materiales del configurador — extraído de StepMateriales.tsx
// ("use client") a un módulo plano para que el generador de PDF y el panel
// admin (ambos server-side) puedan resolver selecciones de materiales sin
// que Next.js trate las exportaciones como referencias de cliente opacas.
//
// Cada categoría agrupa uno o más "selectores". Un selector es una franja de
// cards de selección única para un mismo slot (`key`). Dos selectores pueden
// compartir el mismo `key` (ej. exterior base + exterior premium): al
// compartir estado, elegir una opción premium desactiva automáticamente la
// base elegida antes, y viceversa — son alternativas del mismo componente
// físico. Cuando `priceName` está definido, esa franja tiene costo adicional
// (se resuelve contra `siteConfig.preciosExtras` en Sanity, con fallback a
// `precioAdicionalDefault`). `nullable` permite deseleccionar (para extras
// opcionales que no reemplazan nada, como bañera o galería).

export type MaterialOption = {
  id: string;
  label: string;
  img?: string;
  color?: string;
  /** Borde sutil — para colores claros que se pierden contra el fondo blanco. */
  border?: boolean;
};

export type MaterialSelector = {
  /** Slot de estado — dos selectores con el mismo key comparten selección. */
  key: string;
  label: string;
  options: MaterialOption[];
  /** Permite deseleccionar (click de nuevo = ninguno). Default: false. */
  nullable?: boolean;
  /** Si está seteado, esta franja tiene costo adicional. Nombre usado tanto
   *  para mostrarlo (badge, desglose, WhatsApp) como para buscar el precio
   *  cargado en Sanity (`preciosExtras[].nombre`). */
  priceName?: string;
  /** "contain" para objetos verticales (puertas, ventanas): se ve la pieza
   *  completa, sin recortar. Default "cover" — para fotos de ambientes o
   *  exteriores completos, donde sí conviene llenar el recuadro. */
  imageFit?: "cover" | "contain";
  /** Fondo neutro detrás de la imagen cuando imageFit es "contain". */
  imageBg?: string;
};

export type MaterialCategoryGroup = {
  key: string;
  title: string;
  selectors: MaterialSelector[];
};

export type MaterialesSeleccion = Record<string, string | null>;

const DIR = "/configurador";

const EXTERIOR_PREMIUM = [
  ["01-gris-lineas", "Gris con líneas"],
  ["02-azul-oscuro", "Azul oscuro"],
  ["03-gris-oscuro", "Gris oscuro"],
  ["04-marron-oscuro", "Marrón oscuro"],
  ["05-madera-clara", "Madera clara"],
  ["06-ladrillo", "Ladrillo"],
  ["07-madera-naranja", "Madera naranja"],
  ["08-gris-medio", "Gris medio"],
  ["09-madera-clara2", "Madera clara 2"],
  ["10-marron-veta", "Marrón veteado"],
  ["11-madera-vertical", "Madera vertical"],
  ["12-blanco-liso", "Blanco liso"],
  ["13-amarillo", "Amarillo"],
  ["14-celeste", "Celeste"],
  ["15-rosa", "Rosa"],
  ["16-verde", "Verde"],
  ["17-naranja", "Naranja"],
] as const;

export const MATERIAL_CATEGORY_GROUPS: MaterialCategoryGroup[] = [
  {
    key: "exterior-group",
    title: "Apariencia exterior",
    selectors: [
      {
        key: "exterior",
        label: "Opciones base — sin costo",
        options: [
          { id: "gris-oscuro", img: `${DIR}/exterior-01-gris-oscuro.png`, label: "Gris oscuro" },
          { id: "madera-naranja", img: `${DIR}/exterior-02-madera-naranja.png`, label: "Madera naranja" },
          { id: "madera-marron", img: `${DIR}/exterior-03-madera-marron.png`, label: "Madera marrón" },
          { id: "blanco", img: `${DIR}/exterior-04-blanco.png`, label: "Blanco" },
          { id: "gris-claro", img: `${DIR}/exterior-05-gris-claro.png`, label: "Gris claro" },
          { id: "blanco-negro", img: `${DIR}/exterior-06-blanco-negro.png`, label: "Blanco con negro" },
        ],
      },
      {
        key: "exterior",
        label: "Opciones con diseño — costo adicional",
        priceName: "Paneles premium",
        options: EXTERIOR_PREMIUM.map(([suffix, label]) => ({
          id: `premium-${suffix}`,
          img: `${DIR}/exterior-premium-${suffix}.png`,
          label,
        })),
      },
    ],
  },
  {
    key: "piso-group",
    title: "Piso",
    selectors: [
      {
        key: "piso",
        label: "PVC estándar — sin costo",
        options: [
          { id: "nogal-oscuro", img: `${DIR}/piso/piso-pvc-01-nogal.jpg`, color: "#3d2b1f", label: "Nogal oscuro" },
          { id: "gris-oscuro", img: `${DIR}/piso/piso-pvc-02-gris-oscuro.jpg`, color: "#4a4a4a", label: "Gris oscuro" },
          { id: "pino-blanco", img: `${DIR}/piso/piso-pvc-03-pino-blanco.jpg`, color: "#f0e6d3", label: "Pino blanco", border: true },
          { id: "maple", img: `${DIR}/piso/piso-pvc-04-maple.jpg`, color: "#c8a46e", label: "Maple" },
          { id: "castano-gris", img: `${DIR}/piso/piso-pvc-05-castano.jpg`, color: "#8a8070", label: "Castaño gris" },
        ],
      },
      {
        key: "piso",
        label: "SPC premium — costo adicional",
        priceName: "Piso SPC",
        options: [
          { id: "spc-8917", img: `${DIR}/piso/piso-spc-8917.jpg`, color: "#8b5e3c", label: "8917" },
          { id: "spc-8916", img: `${DIR}/piso/piso-spc-8916.jpg`, color: "#c79a65", label: "8916" },
          { id: "spc-8915", img: `${DIR}/piso/piso-spc-8915.jpg`, color: "#c9a876", label: "8915" },
          { id: "spc-8913", img: `${DIR}/piso/piso-spc-8913.jpg`, color: "#6e6259", label: "8913" },
          { id: "spc-8912", img: `${DIR}/piso/piso-spc-8912.jpg`, color: "#d8b98b", label: "8912" },
          { id: "spc-8911", img: `${DIR}/piso/piso-spc-8911.jpg`, color: "#e8dfc8", label: "8911" },
          { id: "spc-8918", img: `${DIR}/piso/piso-spc-8918.jpg`, color: "#5c3a26", label: "8918" },
          { id: "spc-8920", img: `${DIR}/piso/piso-spc-8920.jpg`, color: "#6b2e22", label: "8920" },
          { id: "spc-8921", img: `${DIR}/piso/piso-spc-8921.jpg`, color: "#8c8c8c", label: "8921" },
          { id: "spc-8923", img: `${DIR}/piso/piso-spc-8923.jpg`, color: "#d9c4a0", label: "8923" },
          { id: "spc-8927", img: `${DIR}/piso/piso-spc-8927.jpg`, color: "#7c7873", label: "8927" },
        ],
      },
    ],
  },
  {
    key: "bano-group",
    title: "Baño",
    selectors: [
      {
        key: "panelesBano",
        label: "Paneles de pared — sin costo",
        options: [
          { id: "marmol-venas", img: `${DIR}/bano-panel-01-marmol-venas1.png`, label: "Mármol blanco con venas" },
          { id: "marmol-dorado", img: `${DIR}/bano-panel-02-marmol-dorado.png`, label: "Mármol dorado" },
          { id: "blanco-liso", img: `${DIR}/bano-panel-03-blanco-liso.png`, label: "Blanco liso" },
          { id: "gris-marmol", img: `${DIR}/bano-panel-04-gris-marmol.png`, label: "Gris mármol" },
        ],
      },
      {
        key: "puertaBano",
        label: "Puerta de baño — sin costo",
        imageFit: "contain",
        imageBg: "#f5f5f5",
        options: [
          { id: "negro-cuadricula", img: `${DIR}/bano-puerta-01-negro-cuadricula.png`, label: "Negro cuadriculado" },
          { id: "blanco-cuadricula", img: `${DIR}/bano-puerta-02-blanco-cuadricula.png`, label: "Blanco cuadriculado" },
          { id: "blanco-horizontal", img: `${DIR}/bano-puerta-03-blanco-horizontal.png`, label: "Blanco horizontal" },
          { id: "blanco-mixto", img: `${DIR}/bano-puerta-04-blanco-mixto.png`, label: "Blanco mixto" },
        ],
      },
      {
        key: "banera",
        label: "Bañera en lugar de ducha — costo adicional",
        nullable: true,
        priceName: "Bañera",
        options: [
          { id: "banera-01", img: `${DIR}/bano-banera-01.png`, label: "Bañera — opción 1" },
          { id: "banera-02", img: `${DIR}/bano-banera-02.png`, label: "Bañera — opción 2" },
          { id: "banera-03", img: `${DIR}/bano-banera-03.png`, label: "Bañera — opción 3" },
        ],
      },
    ],
  },
  {
    key: "cocina-group",
    title: "Cocina",
    selectors: [
      {
        key: "cocina",
        label: "Cocina L-Shape — sin costo",
        options: [
          { id: "lshape-gris", img: `${DIR}/cocina-01-lshape-gris.png`, label: "L-Shape gris" },
          { id: "lshape-blanco", img: `${DIR}/cocina-02-lshape-blanco.png`, label: "L-Shape blanco" },
          { id: "lshape-blanco-moderno", img: `${DIR}/cocina-03-lshape-blanco2.png`, label: "L-Shape blanco moderno" },
          { id: "lshape-blanco-clasico", img: `${DIR}/cocina-04-lshape-blanco-blanco..png`, label: "L-Shape blanco clásico" },
          { id: "lshape-madera", img: `${DIR}/cocina-04-lshape-madera.png`, label: "L-Shape madera" },
          { id: "lshape-moderno-negro", img: `${DIR}/cocina-04-lshape-moderno-negro.png`, label: "L-Shape moderno negro" },
        ],
      },
      {
        key: "mesada",
        label: "Mesada — sin costo",
        options: [
          { id: "granito-claro", img: `${DIR}/cocina/cocina-mesada-granito-claro.jpg`, color: "#d9d6cf", label: "Granito claro", border: true },
          { id: "blanco", img: `${DIR}/cocina/cocina-mesada-blanco.jpg`, color: "#f4f3ef", label: "Blanco", border: true },
          { id: "marmol-blanco-vetas-doradas", img: `${DIR}/cocina/cocina-mesada-marmol-vetas-doradas.jpg`, color: "#efece6", label: "Mármol blanco vetas doradas", border: true },
          { id: "marmol-blanco-vetas-grises", img: `${DIR}/cocina/cocina-mesada-marmol-vetas-grises.jpg`, color: "#e9eaec", label: "Mármol blanco vetas grises", border: true },
          { id: "negro-vetas-doradas", img: `${DIR}/cocina/cocina-mesada-negro-vetas-doradas.jpg`, color: "#1f1e1c", label: "Negro vetas doradas" },
        ],
      },
      {
        key: "cocinaAmpliada",
        label: "Cocina ampliada — costo adicional",
        nullable: true,
        priceName: "Cocina ampliada",
        options: [
          { id: "alacena-01", img: `${DIR}/cocina-premium-alacena-01.png`, label: "Con alacena — opción 1" },
          { id: "alacena-02", img: `${DIR}/cocina-premium-alacena-02.png`, label: "Con alacena — opción 2" },
          { id: "alacena-03", img: `${DIR}/cocina-premium-alacena-03.png`, label: "Con alacena — opción 3" },
          { id: "ushape-01", img: `${DIR}/cocina-premium-ushape-01.png`, label: "En U — opción 1" },
          { id: "ushape-02", img: `${DIR}/cocina-premium-ushape-02.png`, label: "En U — opción 2" },
        ],
      },
    ],
  },
  {
    key: "puertas-group",
    title: "Puertas y ventanas",
    selectors: [
      {
        key: "puertaPrincipal",
        label: "Puerta principal — sin costo",
        imageFit: "contain",
        imageBg: "#f0f0f0",
        options: [
          { id: "corredera-doble", img: `${DIR}/puertacorrediza2hojas.png`, label: "Corredera doble hoja" },
          { id: "doble-hoja-abatible", img: `${DIR}/puertadeabrir2hojas.png`, label: "Doble hoja abatible" },
          { id: "vidrio-lateral", img: `${DIR}/puerta4vidrios.png`, label: "Con vidrio lateral" },
          { id: "doble-hoja-moderna", img: `${DIR}/puertadoblehojaconcargo.png`, label: "Doble hoja moderna" },
        ],
      },
      {
        key: "ventanas",
        label: "Ventanas — sin costo",
        imageFit: "contain",
        imageBg: "#f0f0f0",
        options: [
          { id: "estandar-mosquitero", img: `${DIR}/ventanadeabrirconmosquitero.png`, label: "Estándar con mosquitero" },
          { id: "abatible-fija", img: `${DIR}/ventanaconabatienteconcargo.png`, label: "Abatible con paño fijo" },
        ],
      },
    ],
  },
  {
    key: "extras-group",
    title: "Extras exteriores",
    selectors: [
      {
        key: "muroVidrio",
        label: "Muro cortina de vidrio — costo adicional",
        nullable: true,
        priceName: "Muro cortina",
        options: [{ id: "vidrio-01", img: `${DIR}/balcon%20solo.png`, label: "Muro cortina de vidrio" }],
      },
      {
        key: "galeria",
        label: "Galería con sobretecho — costo adicional",
        nullable: true,
        priceName: "Galería con sobretecho",
        options: [{ id: "galeria-01", img: `${DIR}/balcon%20con%20techocompleto.png`, label: "Galería con sobretecho" }],
      },
    ],
  },
];

export function getDefaultMateriales(): MaterialesSeleccion {
  const result: MaterialesSeleccion = {};
  for (const cat of MATERIAL_CATEGORY_GROUPS) {
    for (const sel of cat.selectors) {
      if (!(sel.key in result)) {
        result[sel.key] = sel.nullable ? null : sel.options[0]?.id ?? null;
      }
    }
  }
  return result;
}

export function findMaterialOption(key: string, id: string | null): { option: MaterialOption; selector: MaterialSelector } | null {
  if (!id) return null;
  for (const cat of MATERIAL_CATEGORY_GROUPS) {
    for (const sel of cat.selectors) {
      if (sel.key !== key) continue;
      const option = sel.options.find((o) => o.id === id);
      if (option) return { option, selector: sel };
    }
  }
  return null;
}

export function getMaterialLabel(key: string, id: string | null): string {
  return findMaterialOption(key, id)?.option.label ?? "(no seleccionado)";
}

// Opciones que el configurador ofreció alguna vez y ya no existen. Los
// pedidos guardados conservan esos ids en `materiales`: no se ofrecen más
// (findMaterialOption no las encuentra, así que tampoco suman precio), pero
// se siguen mostrando con su nombre en el admin y en los PDFs.
const RETIRED_MATERIAL_LABELS: Record<string, Record<string, string>> = {
  mesada: {
    negro: "Negro",
    "blanco-marmol": "Blanco mármol",
    gris: "Gris",
    dorado: "Dorado/Ocre",
    "blanco-marmol-venas-grises": "Blanco mármol con venas grises",
    "negro-absoluto": "Negro absoluto",
    "gris-cemento": "Gris cemento",
    "beige-arena": "Beige arena",
    "verde-agua": "Verde agua",
  },
};

/** Texto para mostrar un valor guardado en `materiales`: label del catálogo,
 *  label de una opción retirada (marcada como discontinuada), o el texto
 *  libre cargado a mano por el admin tal cual. null si no hay valor. */
export function getStoredMaterialLabel(key: string, raw: string | null): string | null {
  if (!raw) return null;
  const found = findMaterialOption(key, raw);
  if (found) return found.option.label;
  const retired = RETIRED_MATERIAL_LABELS[key]?.[raw];
  if (retired) return `${retired} (opción discontinuada)`;
  return raw;
}
