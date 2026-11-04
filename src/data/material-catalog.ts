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
// (se resuelve contra `siteConfig.preciosExtras` en Sanity, con fallback en
// precios-extras.ts). `aConsultar` marca extras sin precio de lista (bañera,
// muro cortina, sobretecho completo): no suman al precio estimado y figuran
// "A consultar" en el configurador, el admin, los PDFs y el email. Una opción
// puede tener su propio `priceName`/`aConsultar` (el techo del balcón).
// `nullable` permite deseleccionar (para extras opcionales que no reemplazan
// nada, como bañera o balcón).

import {
  PRECIO_BALCON,
  PRECIO_FACHADA,
  PRECIO_INODORO,
  PRECIO_PISO_SPC,
  PRECIO_COCINA_AMPLIADA,
  PRECIO_BASE_DUCHA,
  PRECIO_PUERTA_MODERNA,
  PRECIO_COCINA_U,
} from "./precios-extras";

export type MaterialOption = {
  id: string;
  label: string;
  img?: string;
  color?: string;
  /** Borde sutil — para colores claros que se pierden contra el fondo blanco. */
  border?: boolean;
  /** Texto bajo el nombre — para opciones sin foto propia. */
  descripcion?: string;
  /** Precio propio de esta opción (pisa el del selector). */
  priceName?: string;
  /** Esta opción se cotiza aparte (pisa el del selector). */
  aConsultar?: boolean;
  /** Nombre del extra con costo de esta opción en el desglose, el WhatsApp
   *  y los PDF (ej. "Base de ducha (negra)"). Sin él: "precio: opción". */
  extraNombre?: string;
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
  /** Sin precio de lista: no suma al precio estimado y se cotiza aparte
   *  ("Precio a consultar" en el configurador, "A cotizar" internamente). */
  aConsultar?: boolean;
  /** "contain" para objetos verticales (puertas, ventanas): se ve la pieza
   *  completa, sin recortar. Default "cover" — para fotos de ambientes o
   *  exteriores completos, donde sí conviene llenar el recuadro. */
  imageFit?: "cover" | "contain";
  /** Fondo neutro detrás de la imagen cuando imageFit es "contain". */
  imageBg?: string;
  /** Fotos verticales: la card las muestra completas (3:4, sin recorte) y
   *  con una lupa que las abre a pantalla completa. */
  fotosVerticales?: boolean;
  /** Texto para pedidos guardados antes de que existiera este selector. */
  sinDato?: string;
};

export type MaterialCategoryGroup = {
  key: string;
  title: string;
  selectors: MaterialSelector[];
};

export type MaterialesSeleccion = Record<string, string | null>;

const DIR = "/configurador";

/** Fotos de ambientes (casas, cocinas, baños): se ven completas, sin
 *  recorte, sobre fondo oscuro. Las texturas (piso, mesada, paneles) sí
 *  llenan la card: recortarlas no esconde nada. */
const FOTO_COMPLETA = { imageFit: "contain", imageBg: "#1A1A1A" } as const;

/** Id del inodoro inteligente en `materiales.inodoro`. En el admin es el
 *  extra "inodoro-inteligente" (admin-extras.ts). */
export const INODORO_INTELIGENTE_ID = "inteligente-bidet";

export const BALCON_GROUP_KEY = "balcon-group";
export const BANO_GROUP_KEY = "bano-group";

/** Nombres de las opciones de amoblamiento del baño — se cambian acá. Las
 *  fotos van en public/configurador/bano/bano-amoblamiento-01.jpg a 04.jpg;
 *  mientras no existan, cada card muestra "Foto próximamente". */
export const AMOBLAMIENTO_BANO_OPCIONES = [
  "Amoblamiento — opción 1",
  "Amoblamiento — opción 2",
  "Amoblamiento — opción 3",
  "Amoblamiento — opción 4",
] as const;

/** Opciones de amoblamiento que incluyen base de ducha (con costo): la 2
 *  trae base negra y la 4 base blanca. Las demás son sin costo. */
const BASE_DUCHA_POR_OPCION: Record<number, { es: string; en: string }> = {
  1: { es: "negra", en: "black" },
  3: { es: "blanca", en: "white" },
};

const amoblamientoId = (i: number) => `amoblamiento-${String(i + 1).padStart(2, "0")}`;

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
        ...FOTO_COMPLETA,
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
        label: "Panel metálico labrado — costo adicional",
        ...FOTO_COMPLETA,
        priceName: PRECIO_FACHADA,
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
        label: "Piso SPC 4 mm — costo adicional",
        priceName: PRECIO_PISO_SPC,
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
    key: BANO_GROUP_KEY,
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
        key: "amoblamientoBano",
        label: "Amoblamiento del baño",
        sinDato: "—",
        fotosVerticales: true,
        imageFit: "contain",
        imageBg: "#1c1917",
        options: AMOBLAMIENTO_BANO_OPCIONES.map((label, i) => {
          const base = BASE_DUCHA_POR_OPCION[i];
          return {
            id: amoblamientoId(i),
            img: `${DIR}/bano/bano-${amoblamientoId(i)}.jpg`,
            label,
            ...(base && {
              priceName: PRECIO_BASE_DUCHA,
              descripcion: `Incluye base de ducha ${base.es}`,
              extraNombre: `${PRECIO_BASE_DUCHA} (${base.es})`,
            }),
          };
        }),
      },
      {
        key: "banera",
        label: "Bañera en lugar de ducha — precio a consultar",
        ...FOTO_COMPLETA,
        nullable: true,
        aConsultar: true,
        options: [
          { id: "banera-01", img: `${DIR}/bano-banera-01.png`, label: "Bañera — opción 1" },
          { id: "banera-02", img: `${DIR}/bano-banera-02.png`, label: "Bañera — opción 2" },
          { id: "banera-03", img: `${DIR}/bano-banera-03.png`, label: "Bañera — opción 3" },
        ],
      },
      {
        key: "inodoro",
        label: "Inodoro inteligente — costo adicional",
        nullable: true,
        priceName: PRECIO_INODORO,
        // Sin foto propia todavía: la card muestra nombre y descripción.
        options: [
          {
            id: INODORO_INTELIGENTE_ID,
            label: "Inodoro inteligente con bidet",
            descripcion: "En lugar del inodoro estándar. Con bidet incorporado.",
          },
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
        ...FOTO_COMPLETA,
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
        ...FOTO_COMPLETA,
        nullable: true,
        priceName: PRECIO_COCINA_AMPLIADA,
        options: [
          { id: "alacena-01", img: `${DIR}/cocina-premium-alacena-01.png`, label: "Con alacena — opción 1" },
          { id: "alacena-02", img: `${DIR}/cocina-premium-alacena-02.png`, label: "Con alacena — opción 2" },
          { id: "alacena-03", img: `${DIR}/cocina-premium-alacena-03.png`, label: "Con alacena — opción 3" },
          // Las cocinas en U son su propio extra (con costo de fábrica); las
          // de alacena siguen en "Cocina ampliada".
          { id: "ushape-01", img: `${DIR}/cocina-premium-ushape-01.png`, label: "En U — opción 1", priceName: PRECIO_COCINA_U, extraNombre: `${PRECIO_COCINA_U} — opción 1` },
          { id: "ushape-02", img: `${DIR}/cocina-premium-ushape-02.png`, label: "En U — opción 2", priceName: PRECIO_COCINA_U, extraNombre: `${PRECIO_COCINA_U} — opción 2` },
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
        // Solo la doble hoja moderna tiene costo; las demás son sin costo.
        label: "Puerta principal",
        imageFit: "contain",
        imageBg: "#f0f0f0",
        options: [
          { id: "corredera-doble", img: `${DIR}/puertacorrediza2hojas.png`, label: "Corredera doble hoja" },
          { id: "doble-hoja-abatible", img: `${DIR}/puertadeabrir2hojas.png`, label: "Doble hoja abatible" },
          { id: "vidrio-lateral", img: `${DIR}/puerta4vidrios.png`, label: "Con vidrio lateral" },
          {
            id: "doble-hoja-moderna",
            img: `${DIR}/puertadoblehojaconcargo.png`,
            label: "Doble hoja moderna",
            priceName: PRECIO_PUERTA_MODERNA,
            extraNombre: PRECIO_PUERTA_MODERNA,
          },
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
        label: "Muro cortina de vidrio — precio a consultar",
        nullable: true,
        aConsultar: true,
        // Sin foto propia todavía: la card muestra nombre y descripción.
        options: [
          {
            id: "vidrio-01",
            label: "Muro cortina de vidrio",
            descripcion: "Pared de vidrio en lugar de un panel ciego. La definimos con vos en el presupuesto.",
          },
        ],
      },
    ],
  },
  // Se elige en su propia sección de "Configurá tu espacio" (no en la grilla
  // de materiales): el techo solo aparece si hay balcón, y el lateral solo
  // para BALCON_LATERAL_MODELOS.
  {
    key: BALCON_GROUP_KEY,
    title: "Balcón",
    selectors: [
      {
        key: "balcon",
        label: "Balcón",
        nullable: true,
        options: [
          { id: "frontal", label: "Balcón frontal" },
          { id: "lateral", label: "Balcón lateral" },
        ],
      },
      {
        key: "techoBalcon",
        label: "Techo del balcón",
        ...FOTO_COMPLETA,
        // Con balcón el techo es obligatorio (lo elige el configurador); el
        // null es "sin balcón".
        nullable: true,
        options: [
          {
            id: "solo-balcon",
            img: `${DIR}/balcon%20solo.png`,
            label: "Sobretecho solo en el balcón",
            priceName: PRECIO_BALCON,
          },
          {
            id: "completo",
            img: `${DIR}/balcon%20con%20techocompleto.png`,
            label: "Sobretecho completo: balcón y toda la unidad",
            aConsultar: true,
          },
        ],
      },
    ],
  },
];

/** Modelos que admiten balcón lateral (superficie mayor a 18 m²). */
export const BALCON_LATERAL_MODELOS: readonly string[] = ["20ft", "40ft"];

export type ExtraElegido = { key: string; nombre: string } & (
  | { tipo: "precio"; priceName: string }
  | { tipo: "a-consultar" }
);

/** Extras elegidos (con precio o a consultar), en orden de catálogo.
 *
 *  El balcón va junto con su techo: con sobretecho solo en el balcón es un
 *  extra con precio (incluye deck y barandas); con sobretecho completo, o sin
 *  techo, el balcón entero pasa a consultar. Un techo sin balcón no cuenta. */
export function getExtrasElegidos(materiales: MaterialesSeleccion): ExtraElegido[] {
  const seen = new Set<string>();
  return MATERIAL_CATEGORY_GROUPS.flatMap((g) => g.selectors).flatMap((sel): ExtraElegido[] => {
    if (seen.has(sel.key)) return [];
    seen.add(sel.key);
    const found = findMaterialOption(sel.key, materiales[sel.key] ?? null);
    if (!found) return [];
    const { option, selector } = found;

    if (sel.key === "techoBalcon") return [];
    if (sel.key === "balcon") {
      const techo = findMaterialOption("techoBalcon", materiales.techoBalcon ?? null)?.option;
      if (techo?.priceName) {
        return [{ key: "balcon", nombre: `${option.label} de 2 m con sobretecho, deck y barandas`, tipo: "precio", priceName: techo.priceName }];
      }
      return [
        { key: "balcon", nombre: option.label, tipo: "a-consultar" },
        ...(techo ? [{ key: "techoBalcon", nombre: techo.label, tipo: "a-consultar" as const }] : []),
      ];
    }

    if (option.aConsultar ?? selector.aConsultar) return [{ key: sel.key, nombre: option.label, tipo: "a-consultar" }];
    const priceName = option.priceName ?? selector.priceName;
    if (!priceName) return [];
    // Nombre propio de la opción (base de ducha); un selector de una sola
    // opción (el inodoro) se nombra con su opción.
    const nombre = option.extraNombre ?? (selector.options.length === 1 ? option.label : `${priceName}: ${option.label}`);
    return [{ key: sel.key, nombre, tipo: "precio", priceName }];
  });
}

/** Nombre en inglés de cada opción de amoblamiento, para el PDF del proveedor. */
export const AMOBLAMIENTO_BANO_EN: Record<string, string> = Object.fromEntries(
  AMOBLAMIENTO_BANO_OPCIONES.map((_, i) => {
    const base = BASE_DUCHA_POR_OPCION[i];
    return [amoblamientoId(i), `Bathroom furniture — option ${i + 1}${base ? ` · Shower base — ${base.en}` : ""}`];
  })
);

/** Extra con costo que trae la opción elegida ("Base de ducha (negra)"), para
 *  mostrarlo junto a la opción en el admin y en el PDF del cliente. */
export function getExtraDeOpcion(key: string, id: string | null): string | null {
  return findMaterialOption(key, id)?.option.extraNombre ?? null;
}

/** Cómo se muestra una opción junto con su extra: si el nombre del extra ya
 *  contiene el de la opción, solo el extra ("Puerta doble hoja moderna",
 *  "Cocina en U — opción 1"); si no, los dos ("Amoblamiento — opción 4 —
 *  Base de ducha (blanca)"). */
export function etiquetaConExtra(label: string, extra: string | null | undefined): string {
  if (!extra) return label;
  return extra.toLowerCase().includes(label.toLowerCase()) ? extra : `${label} — ${extra}`;
}

/** Keys de los selectores del baño. */
export const BANO_KEYS: readonly string[] = [
  ...new Set(MATERIAL_CATEGORY_GROUPS.find((g) => g.key === BANO_GROUP_KEY)!.selectors.map((s) => s.key)),
];

/** Lo elegido que corresponde a los ambientes incluidos: sin baño, todo lo
 *  del baño (paneles, puerta, bañera, inodoro...) queda sin elegir, así no
 *  suma al precio ni figura en el pedido. La selección original se conserva
 *  en el configurador por si vuelve a elegir baño. */
export function materialesSegunAmbientes(materiales: MaterialesSeleccion, { incluyeBano }: { incluyeBano: boolean }): MaterialesSeleccion {
  if (incluyeBano) return materiales;
  return { ...materiales, ...Object.fromEntries(BANO_KEYS.map((k) => [k, null])) };
}

/** Opciones "a consultar" elegidas, en orden de catálogo: no suman al precio
 *  estimado y se cotizan aparte. */
export function getOpcionesAConsultar(materiales: MaterialesSeleccion): { key: string; nombre: string }[] {
  return getExtrasElegidos(materiales).flatMap((e) => (e.tipo === "a-consultar" ? [{ key: e.key, nombre: e.nombre }] : []));
}

/** Si lo elegido en este selector se cotiza aparte (depende de la selección:
 *  el balcón solo es a consultar con sobretecho completo). */
export function esSelectorAConsultar(key: string, materiales: MaterialesSeleccion): boolean {
  return getOpcionesAConsultar(materiales).some((o) => o.key === key);
}

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

// Selectores que el configurador ya no tiene, pero que quedaron guardados en
// pedidos viejos. La galería con sobretecho pasó a ser el techo de la sección
// Balcón: no está discontinuada, cambió cómo se elige.
const SELECTORES_ANTERIORES: Record<string, { nombre: string; opciones: Record<string, string> }> = {
  galeria: { nombre: "Galería", opciones: { "galeria-01": "Galería con sobretecho" } },
};

/** Valores guardados en selectores que ya no existen (ej. `galeria`), para
 *  que el admin y los PDFs los sigan mostrando. */
export function getMaterialesAnteriores(materiales: MaterialesSeleccion): { key: string; nombre: string; label: string }[] {
  return Object.entries(SELECTORES_ANTERIORES).flatMap(([key, sel]) => {
    const raw = materiales[key];
    if (!raw) return [];
    return [{ key, nombre: sel.nombre, label: `${sel.opciones[raw] ?? raw} (configuración anterior)` }];
  });
}

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
