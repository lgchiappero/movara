/** Textos por defecto de /nosotros. Los usa la página cuando un campo del
 * documento quienesSomos de Sanity está vacío, y el schema como initialValue,
 * así el Studio arranca con el mismo contenido que se ve en el sitio. */

export type BloqueTexto = {
  _type: "block";
  _key: string;
  style: "normal";
  markDefs: [];
  children: { _type: "span"; _key: string; text: string; marks: [] }[];
};

export type BloquePresencia = { _key: string; subtitulo: string; texto: string };
export type Valor = { _key: string; icon?: string | null; title: string; description: string };

function parrafo(key: string, text: string): BloqueTexto {
  return {
    _type: "block",
    _key: key,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
  };
}

export const QUIENES_SOMOS_DEFAULTS = {
  hero: {
    title: "Estamos repensando la forma de habitar.",
    subtitle:
      "MOVARA nace en Sunchales, Santa Fe, con una idea simple: que tener tu espacio no tenga que llevar años de obra, presupuestos que cambian y sorpresas.",
  },
  historia: {
    title: "Nuestra historia",
    content: [
      parrafo(
        "historia-1",
        "MOVARA empezó con una pregunta: ¿por qué construir en Argentina sigue siendo tan lento, caro e incierto? Encontramos la respuesta en la construcción industrializada: casas modulares producidas en planta bajo controles de calidad, con estructura de acero y certificación CE, que llegan terminadas y listas para habitar."
      ),
      parrafo(
        "historia-2",
        "Elegimos cada material pensando en nuestro clima: aislación de lana de roca, aberturas con DVH y RPT y terminaciones de primera línea. Y armamos un proceso claro, con plazos de 90 días en adelante desde el anticipo y un precio que conocés desde el primer día."
      ),
    ],
  },
  presencia: {
    title: "De Sunchales a todo el país",
    bloques: [
      {
        _key: "donde-estamos",
        subtitulo: "Dónde estamos",
        texto:
          "Nuestra base está en Sunchales, en el corazón de la región centro. Ahí estamos construyendo nuestro showroom, que abre a mediados de diciembre: vas a poder recorrer una unidad real, tocar los materiales y ver con tus propios ojos cómo se vive en un MOVARA.",
      },
      {
        _key: "como-llegamos",
        subtitulo: "Cómo llegamos a cada punto de la Argentina",
        texto:
          "Cada unidad viaja terminada en camión hasta tu terreno, y nosotros coordinamos el traslado esté donde esté: del litoral a la Patagonia, de Cuyo al norte. Y no hace falta que vengas: configurás tu espacio online, recibís tu presupuesto y te acompañamos por WhatsApp en cada etapa, de la consulta a la entrega.",
      },
      {
        _key: "hacia-donde-vamos",
        subtitulo: "Hacia dónde vamos",
        texto:
          "Queremos que en cada provincia haya un MOVARA habitado que cuente nuestra historia mejor que cualquier aviso. Cada entrega nos acerca a ese objetivo: hacer de la casa modular de diseño una opción real para vivir, invertir o trabajar en cualquier lugar del país.",
      },
    ] satisfies BloquePresencia[],
  },
  mision: {
    title: "Misión",
    text: "Hacer que tener un espacio propio, para vivir, invertir o trabajar, sea simple, rápido y previsible, sin importar en qué lugar de la Argentina estés.",
  },
  vision: {
    title: "Visión",
    text: "Ser la referencia en casas modulares de diseño en Argentina, con presencia en cada provincia.",
  },
  valores: [
    { _key: "transparencia", title: "Transparencia", description: "Precio, plazos y condiciones claros desde el primer contacto." },
    { _key: "calidad", title: "Calidad verificable", description: "Materiales certificados y documentación técnica para cada unidad." },
    { _key: "acompanamiento", title: "Acompañamiento", description: "Te seguimos en cada etapa, estés cerca o lejos." },
    { _key: "diseno", title: "Diseño", description: "Espacios pensados para vivirse bien, no solo para cumplir metros." },
  ] as Valor[],
};

type Texto = string | null | undefined;

export type QuienesSomosSanity = {
  hero?: { title?: Texto; subtitle?: Texto; backgroundImage?: unknown } | null;
  historia?: { title?: Texto; content?: unknown[] | null } | null;
  presencia?: {
    title?: Texto;
    bloques?: { _key?: string; subtitulo?: Texto; texto?: Texto }[] | null;
  } | null;
  mision?: { title?: Texto; text?: Texto } | null;
  vision?: { title?: Texto; text?: Texto } | null;
  valores?: { _key?: string; icon?: Texto; title?: Texto; description?: Texto }[] | null;
  /** Se ignora: la sección Equipo no se muestra en el sitio. */
  equipo?: unknown;
};

const texto = (valor: Texto, porDefecto: string) => (valor?.trim() ? valor : porDefecto);

/** Mezcla el documento de Sanity con los textos por defecto, campo por campo:
 * lo que esté cargado en el Studio gana; lo vacío cae al default. La sección
 * Equipo queda afuera aunque tenga datos. */
export function resolverQuienesSomos(data: QuienesSomosSanity | null) {
  const d = QUIENES_SOMOS_DEFAULTS;

  const bloques = (data?.presencia?.bloques ?? []).filter((b) => b.subtitulo?.trim() && b.texto?.trim());
  const valores = (data?.valores ?? []).filter((v) => v.title?.trim());
  const historia = data?.historia?.content;

  return {
    hero: {
      title: texto(data?.hero?.title, d.hero.title),
      subtitle: texto(data?.hero?.subtitle, d.hero.subtitle),
      backgroundImage: data?.hero?.backgroundImage ?? null,
    },
    historia: {
      title: texto(data?.historia?.title, d.historia.title),
      content: Array.isArray(historia) && historia.length > 0 ? historia : d.historia.content,
    },
    presencia: {
      title: texto(data?.presencia?.title, d.presencia.title),
      bloques: bloques.length > 0
        ? bloques.map((b, i) => ({ _key: b._key ?? `bloque-${i}`, subtitulo: b.subtitulo!, texto: b.texto! }))
        : d.presencia.bloques,
    },
    mision: { title: texto(data?.mision?.title, d.mision.title), text: texto(data?.mision?.text, d.mision.text) },
    vision: { title: texto(data?.vision?.title, d.vision.title), text: texto(data?.vision?.text, d.vision.text) },
    valores: valores.length > 0
      ? valores.map((v, i) => ({
          _key: v._key ?? `valor-${i}`,
          icon: v.icon ?? null,
          title: v.title!,
          description: v.description ?? "",
        }))
      : d.valores,
  };
}
