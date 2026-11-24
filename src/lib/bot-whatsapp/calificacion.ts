import type { Interactivo } from "@/lib/whatsapp-cloud/cliente";

/** Estrategia de calificación del bot: 3 preguntas de hasta dos datos
 * relacionados cada una y un cierre (4 mensajes del bot).
 *  1. nombre + uso (lista de usos)
 *  2. localidad + terreno (botones de terreno)
 *  3. personas + plazo (botones de plazo)
 *  4. cierre
 * El sistema le dice a Claude en cada llamada qué datos ya están y cuáles
 * faltan, revisa que la respuesta no vuelva a pedir uno que ya está y pone
 * los botones según lo que la respuesta pregunta. */

export const CAMPOS_CALIFICACION = ["nombre", "uso", "zona", "terreno", "personas", "plazo"] as const;
export type CampoCalificacion = (typeof CAMPOS_CALIFICACION)[number];
export type DatosCalificacion = Partial<Record<string, string | null>>;

/** Cómo se nombra cada dato en el bloque que lee Claude. */
export const NOMBRE_CAMPO: Record<CampoCalificacion, string> = {
  nombre: "nombre y apellido",
  uso: "para qué la quiere (uso)",
  zona: "localidad donde la instalaría",
  terreno: "si tiene terreno",
  personas: "cuántas personas la van a usar",
  plazo: "para cuándo la necesita",
};

export type ClaveOpciones = "USO" | "TERRENO" | "PLAZO";

/** Opciones fijas (títulos dentro de los límites de Meta: 24 en lista, 20 en botón). */
export const OPCIONES: Record<ClaveOpciones, { campo: CampoCalificacion; interactivo: Interactivo }> = {
  USO: {
    campo: "uso",
    interactivo: {
      tipo: "lista",
      boton: "Elegir una opción",
      opciones: [
        { id: "uso_vivir", titulo: "Para vivir" },
        { id: "uso_alquilar", titulo: "Para alquilar o invertir" },
        { id: "uso_campo", titulo: "Campo o fin de semana" },
        { id: "uso_empresa", titulo: "Empresa u obra" },
        { id: "uso_otro", titulo: "Otro" },
      ],
    },
  },
  TERRENO: {
    campo: "terreno",
    interactivo: {
      tipo: "botones",
      opciones: [
        { id: "terreno_si", titulo: "Sí, tengo terreno" },
        { id: "terreno_buscando", titulo: "Lo estoy buscando" },
        { id: "terreno_no", titulo: "Todavía no" },
      ],
    },
  },
  PLAZO: {
    campo: "plazo",
    interactivo: {
      tipo: "botones",
      opciones: [
        { id: "plazo_ya", titulo: "Lo antes posible" },
        { id: "plazo_meses", titulo: "En unos meses" },
        { id: "plazo_averiguando", titulo: "Solo averiguando" },
      ],
    },
  },
};

export const PASOS: { campos: [CampoCalificacion, CampoCalificacion]; opciones: ClaveOpciones }[] = [
  { campos: ["nombre", "uso"], opciones: "USO" },
  { campos: ["zona", "terreno"], opciones: "TERRENO" },
  { campos: ["personas", "plazo"], opciones: "PLAZO" },
];

/** Datos secundarios: si faltan después de 4 mensajes del bot, se cierra igual. */
export const CAMPOS_SECUNDARIOS: readonly CampoCalificacion[] = ["personas", "plazo"];
/** Mensajes del bot después de los cuales ya no se pregunta lo secundario
 * ("si tras 4 mensajes del bot falta algo secundario, cerrar igual"). */
export const MENSAJES_ANTES_DEL_CIERRE = 4;

export type Contexto = {
  /** Datos guardados del lead (más los extraídos en el turno, al revisar). */
  datos: DatosCalificacion;
  /** Mensajes que el bot ya mandó en la conversación. */
  mensajesBot: number;
  /** Corrección para la segunda llamada si la primera repitió o pidió de más. */
  correccion?: string | null;
};

const tiene = (datos: DatosCalificacion, campo: CampoCalificacion) => !!datos[campo]?.trim();

export type Siguiente = { tipo: "PREGUNTAR"; campos: CampoCalificacion[]; opciones: ClaveOpciones | null } | { tipo: "CERRAR" };

/** Qué toca ahora: el primer paso con datos que falten (solo esos datos) o
 * el cierre, si no falta nada o si ya hubo 4 mensajes y falta solo lo
 * secundario. */
export function siguientePaso(datos: DatosCalificacion, mensajesBot: number): Siguiente {
  for (const paso of PASOS) {
    const faltan = paso.campos.filter((c) => !tiene(datos, c));
    if (faltan.length === 0) continue;
    if (faltan.every((c) => CAMPOS_SECUNDARIOS.includes(c)) && mensajesBot >= MENSAJES_ANTES_DEL_CIERRE) return { tipo: "CERRAR" };
    const opciones = faltan.includes(OPCIONES[paso.opciones].campo) ? paso.opciones : null;
    return { tipo: "PREGUNTAR", campos: faltan, opciones };
  }
  return { tipo: "CERRAR" };
}

/** Bloque que se agrega al prompt de sistema en cada llamada (después de la
 * parte fija, que queda en caché). */
export function bloqueEstado({ datos, mensajesBot, correccion }: Contexto): string {
  const obtenidos = CAMPOS_CALIFICACION.filter((c) => tiene(datos, c));
  const faltan = CAMPOS_CALIFICACION.filter((c) => !tiene(datos, c));
  const siguiente = siguientePaso(datos, mensajesBot);
  const lineas = [
    "# ESTADO DE ESTA CONVERSACIÓN (lo arma el sistema con lo que ya está guardado; no lo escribió el cliente)",
    `Mensajes que ya mandaste: ${mensajesBot}.`,
    "",
    "DATOS YA OBTENIDOS (nunca los vuelvas a preguntar):",
    ...(obtenidos.length ? obtenidos.map((c) => `- ${NOMBRE_CAMPO[c]}: ${datos[c]!.trim()}`) : ["- (ninguno todavía)"]),
    "",
    "DATOS QUE FALTAN:",
    ...(faltan.length ? faltan.map((c) => `- ${NOMBRE_CAMPO[c]}`) : ["- (ninguno)"]),
    "",
    siguiente.tipo === "CERRAR"
      ? 'PRÓXIMO PASO según lo guardado: cerrar (accion "CALIFICADO"), salvo que el cliente haya hecho una pregunta que tengas que contestar.'
      : `PRÓXIMO PASO según lo guardado: preguntar solo ${siguiente.campos.map((c) => NOMBRE_CAMPO[c]).join(" y ")}.`,
    "Si en sus últimos mensajes el cliente ya dio alguno de los datos que faltan, tomalo (va en datosExtraidos) y preguntá solo lo que siga faltando, siguiendo el orden de los pasos. Si ya no falta nada, cerrá.",
  ];
  if (correccion) lineas.push("", `CORRECCIÓN: ${correccion}`);
  return lineas.join("\n");
}

/* ---------- Qué datos pregunta una respuesta ---------- */

/** Detectores por dato, aplicados solo a las preguntas de la respuesta. */
const DETECTORES: Record<CampoCalificacion, RegExp> = {
  nombre: /\bnombre\b|c[oó]mo te llam|con qui[eé]n (hablo|tengo)/i,
  uso: /para qu[eé](?![a-z])|\buso\b|la pens[aá]s (usar|para)|la quer[eé]s para|(vivir|alquilar|invertir|fin de semana|oficina|obrador)[^?]{0,40}\bo\b/i,
  zona: /\bzona\b|localidad|ciudad|d[oó]nde|qu[eé] lugar|por qu[eé] lado|en qu[eé] parte/i,
  terreno: /terreno|\blote\b/i,
  personas: /cu[aá]nt[oa]s (personas|son|van|ser[ií]an|integrantes|viven|la van)|para cu[aá]nt[oa]s|\bpersonas\b/i,
  plazo: /para cu[aá]ndo|cu[aá]ndo (la|lo|te|se|pens|quer|necesit|ser)|\bplazo\b|en qu[eé] momento|qu[eé] tan pronto/i,
};

/** Las preguntas de un texto: cada oración con "?", desde su "¿". */
export function preguntasDe(texto: string): string[] {
  return texto
    .split(/(?<=[.!?])\s+/)
    .filter((o) => o.includes("?"))
    .map((o) => (o.includes("¿") ? o.slice(o.indexOf("¿")) : o));
}

export function camposPreguntados(texto: string): CampoCalificacion[] {
  const preguntas = preguntasDe(texto).join(" ");
  if (!preguntas) return [];
  return CAMPOS_CALIFICACION.filter((c) => DETECTORES[c].test(preguntas));
}

/** Problemas de una respuesta: datos ya obtenidos que vuelve a preguntar
 * o más de dos datos en el mismo mensaje. Null si está bien. */
export function problemaDeRespuesta(texto: string, datos: DatosCalificacion): { repetidos: CampoCalificacion[]; demasiados: boolean } | null {
  const preguntados = camposPreguntados(texto);
  const repetidos = preguntados.filter((c) => tiene(datos, c));
  const demasiados = preguntados.length > 2;
  return repetidos.length || demasiados ? { repetidos, demasiados } : null;
}

export function textoCorreccion(p: { repetidos: CampoCalificacion[]; demasiados: boolean }): string {
  const partes: string[] = [];
  if (p.repetidos.length) {
    partes.push(`tu respuesta anterior volvía a preguntar ${p.repetidos.map((c) => NOMBRE_CAMPO[c]).join(" y ")}, que ya está obtenido. No lo preguntes: preguntá solo lo que falta.`);
  }
  if (p.demasiados) partes.push("tu respuesta anterior preguntaba más de dos datos. Preguntá como máximo dos, del mismo paso.");
  return partes.join(" ");
}

/** Frases que el bot nunca manda (reglas del prompt que se controlan
 * también en el código): prometer "hoy" o un plazo de respuesta, relleno,
 * términos técnicos, "dormitorio"/"habitación" y cifras de precio. */
const FRASES_PROHIBIDAS: [string, RegExp][] = [
  ['promete "hoy" o un plazo de respuesta', /\bhoy\b|en el d[ií]a|en (unas|pocas|\d+) (horas|minutos)|enseguida|ma[nñ]ana mismo/i],
  [
    "frases de relleno o elogios genéricos",
    /qu[eé] lindo|zona linda|lugar lindo|qu[eé] buena idea|excelente elecci[oó]n|buen punto de partida|opciones muy pr[aá]cticas|gran paso/i,
  ],
  ["términos técnicos", /\b(aislaci[oó]n|aislante|poliuretano|lana de vidrio|espesor|metros cuadrados|m2)\b|m²/i],
  ['la palabra "dormitorio" o "habitación" (se dice "espacios privados")', /dormitorio|habitaci[oó]n|habitaciones/i],
  [
    "cifras de precio",
    /(u?\$|usd|u\$s|d[oó]lares|pesos)\s*\d|\d[\d.,]*\s*(mil|millones?|k)?\s*(de\s+)?(u?\$|usd|u\$s|d[oó]lares|pesos)|por m(2|²)|\/\s*m(2|²)|\bdesde\s+(u?\$|usd|\d)/i,
  ],
];

export function frasesProhibidas(texto: string): string[] {
  return FRASES_PROHIBIDAS.filter(([, r]) => r.test(texto)).map(([nombre]) => nombre);
}

/** Palabras de cada grupo de opciones: si la pregunta nombra dos o más,
 * está escribiendo en el texto las opciones que ya van como lista o botones. */
const PALABRAS_OPCIONES: Record<ClaveOpciones, RegExp[]> = {
  USO: [/vivir/i, /alquil/i, /invert/i, /campo/i, /fin de semana/i, /empresa/i, /\bobra\b/i],
  TERRENO: [/buscando/i, /todav[ií]a no/i, /\bs[ií], tengo/i],
  PLAZO: [/antes posible/i, /unos meses|pr[oó]ximos meses/i, /averiguando/i],
};

export function escribeLasOpciones(texto: string, clave: ClaveOpciones): boolean {
  const preguntas = preguntasDe(texto).join(" ");
  return PALABRAS_OPCIONES[clave].filter((r) => r.test(preguntas)).length >= 2;
}

/** Botones o lista para la respuesta: los del dato con opciones que la
 * respuesta pregunta y que todavía falta. Null si no corresponde. */
export function opcionesPara(texto: string, datos: DatosCalificacion): ClaveOpciones | null {
  const preguntados = camposPreguntados(texto);
  for (const paso of PASOS) {
    const { campo } = OPCIONES[paso.opciones];
    if (preguntados.includes(campo) && !tiene(datos, campo)) return paso.opciones;
  }
  return null;
}

/** Contenido que se guarda en la base para un mensaje con opciones (el
 * panel lo muestra y Claude lo ve en el historial). */
export function contenidoConOpciones(texto: string, interactivo: Interactivo | null): string {
  if (!interactivo) return texto;
  return `${texto}\n[Opciones: ${interactivo.opciones.map((o) => o.titulo).join(" / ")}]`;
}

/* ---------- Cierre ---------- */

/** Cierres del calificado (sin prometer "hoy" ni plazos). Con nombre de pila
 * y sin nombre, si no lo dio. */
export const CIERRES_CALIFICADO: { conNombre: (n: string) => string; sinNombre: string }[] = [
  {
    conNombre: (n) => `Gracias, ${n}, por contarnos todo. Vamos a analizar tu caso puntual y en breve te contactamos con una propuesta pensada para lo que necesitás.`,
    sinNombre: "Gracias por contarnos todo. Vamos a analizar tu caso puntual y en breve te contactamos con una propuesta pensada para lo que necesitás.",
  },
  {
    conNombre: (n) => `Perfecto, ${n}. Con lo que nos contaste ya podemos revisar tu caso en detalle. Luciano te va a escribir a la brevedad para armar juntos la mejor opción.`,
    sinNombre: "Perfecto. Con lo que nos contaste ya podemos revisar tu caso en detalle. Luciano te va a escribir a la brevedad para armar juntos la mejor opción.",
  },
  {
    conNombre: (n) => `Genial, ${n}, muchas gracias. Ya tenemos todo para estudiar tu proyecto. En breve te escribimos con una propuesta a tu medida.`,
    sinNombre: "Genial, muchas gracias. Ya tenemos todo para estudiar tu proyecto. En breve te escribimos con una propuesta a tu medida.",
  },
];

/** Índice estable a partir de un texto (el id del lead): cada lead recibe
 * siempre el mismo cierre y los cierres se alternan entre leads. */
export function indiceDe(semilla: string, cantidad: number): number {
  let h = 0;
  for (const ch of semilla) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % cantidad;
}

/** Nombre de pila, con mayúscula inicial ("sofía martínez" → "Sofía"). */
export function nombreDePila(nombre: string | null | undefined): string | null {
  const pila = nombre?.trim().split(/\s+/)[0];
  if (!pila || pila.length > 30) return null;
  return pila.charAt(0).toLocaleUpperCase("es-AR") + pila.slice(1);
}

export function textoCierre(nombre: string | null | undefined, semilla: string): string {
  const cierre = CIERRES_CALIFICADO[indiceDe(semilla, CIERRES_CALIFICADO.length)];
  const pila = nombreDePila(nombre);
  return pila ? cierre.conNombre(pila) : cierre.sinNombre;
}
