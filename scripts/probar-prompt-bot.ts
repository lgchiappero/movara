// Prueba el bot de WhatsApp con la API REAL de Claude (gasta crédito: unos
// centavos). No toca la base ni WhatsApp: corre la misma tubería que
// producción (generarTurno: datos obtenidos/faltantes, control de
// repeticiones con una regeneración, botones y cierre) con conversaciones
// armadas. En las de varios turnos el cliente está guionado y el bot
// contesta de verdad en cada turno.
//
//   npx tsx scripts/probar-prompt-bot.ts            (todos los casos)
//   npx tsx scripts/probar-prompt-bot.ts familia parcial   (los que contienen "familia" o "parcial")
//
// Necesita ANTHROPIC_API_KEY en .env.local o en la terminal. Nunca la imprime.
import "./_env";
import { crearMotorClaude, MODELO_BOT, type MensajeHistorial } from "../src/lib/bot-whatsapp/ia";
import { costoDeLlamada } from "../src/lib/bot-whatsapp/gasto";
import { FRASES_DERIVACION } from "../src/lib/bot-whatsapp/prompt";
import { generarTurno } from "../src/lib/bot-whatsapp/turno";
import { CAMPOS_CALIFICACION, OPCIONES, contenidoConOpciones, problemaDeRespuesta, camposPreguntados, type DatosCalificacion } from "../src/lib/bot-whatsapp/calificacion";
import type { Accion } from "../src/lib/bot-whatsapp/respuesta";

const c = (contenido: string, tipo: MensajeHistorial["tipo"] = "TEXTO"): MensajeHistorial => ({ autor: "CLIENTE", tipo, contenido });
const b = (contenido: string): MensajeHistorial => ({ autor: "BOT", tipo: "TEXTO", contenido });

/** Un turno del cliente: uno o varios mensajes seguidos (se agrupan como en producción). */
type TurnoCliente = string | string[];

type Caso = {
  nombre: string;
  espera: string;
  /** Conversación previa fija (casos de un solo turno). */
  historial?: MensajeHistorial[];
  /** Conversación guionada: el primer turno y las respuestas a cada mensaje del bot. */
  guion?: TurnoCliente[];
  accionFinal?: Accion;
  empiezaCon?: string;
  /** Máximo de mensajes del bot en la conversación guionada. */
  maxMensajes?: number;
  /** Datos que tienen que quedar al final (subcadena, sin mayúsculas; "" = que exista). */
  datosEsperados?: Partial<Record<(typeof CAMPOS_CALIFICACION)[number], string>>;
};

const CASOS: Caso[] = [
  /* ----- Conversaciones completas (varios turnos) ----- */
  {
    nombre: "familia (conversación completa)",
    espera: "nombre+uso con lista, localidad+terreno con botones, personas+plazo con botones, cierre",
    guion: ["Hola, quería info de las casas", "Sofía Martínez, para vivir con mi pareja y mi nena", "En Rafaela, ya tenemos el terreno", "Somos tres, para mitad del año que viene"],
    accionFinal: "CALIFICADO",
    maxMensajes: 4,
    datosEsperados: { nombre: "sofía martínez", uso: "vivir", zona: "rafaela", terreno: "", personas: "", plazo: "" },
  },
  {
    nombre: "solo botones (nuevo)",
    espera: "escribe solo el nombre y la localidad; el resto lo toca en botones; cierra aunque falten personas",
    guion: ["Hola, info de las casas", ["Juan Pérez", "Para vivir"], "Lo estoy buscando", "Esperanza", "En unos meses"],
    accionFinal: "CALIFICADO",
    maxMensajes: 5,
    datosEsperados: { nombre: "juan pérez", uso: "vivir", zona: "esperanza", terreno: "buscando", plazo: "meses" },
  },
  {
    nombre: "todo en un mensaje (nuevo)",
    espera: "toma todos los datos y cierra en el primer mensaje, sin preguntar nada",
    guion: ["Hola, soy Martín Gómez. Quiero una casa para vivir en Sunchales, ya tengo el terreno, somos 4 y la necesitamos para marzo."],
    accionFinal: "CALIFICADO",
    maxMensajes: 1,
    datosEsperados: { nombre: "martín gómez", uso: "vivir", zona: "sunchales", terreno: "", personas: "4", plazo: "marzo" },
  },
  {
    nombre: "parcial (nuevo)",
    espera: "cada vez pregunta solo lo que falta del paso, sin repetir; tras 4 mensajes cierra sin personas ni plazo",
    guion: ["Hola, quería info", "Laura", "Para alquilar o invertir", "En Santa Fe capital", "Todavía no"],
    accionFinal: "CALIFICADO",
    maxMensajes: 5,
    datosEsperados: { nombre: "laura", uso: "alquilar", zona: "santa fe", terreno: "no" },
  },
  {
    nombre: "empresa constructora (conversación completa)",
    espera: "empieza con 'Sí', no pregunta el uso (ya lo dijo), pide nombre; después localidad+terreno; personas por módulo + plazo; cierre",
    empiezaCon: "Sí",
    guion: [
      "Buenas, somos una constructora y necesitamos 4 módulos para armar un obrador en una obra nueva. ¿Trabajan con empresas?",
      "Carlos Ruiz, de Ruiz Construcciones",
      "En Rafaela, el terreno es de la obra",
      "Unas 8 personas por módulo, lo antes posible",
    ],
    accionFinal: "CALIFICADO",
    maxMensajes: 4,
    datosEsperados: { nombre: "carlos ruiz", uso: "", zona: "rafaela", personas: "8" },
  },
  {
    nombre: "pregunta el precio a mitad de camino",
    espera: "contesta en general sin número y sigue con el paso que toca (sin repetir)",
    guion: ["Hola, quería info de las casas", "Ana López, para fin de semana", "¿Y cuánto sale más o menos?", "En Villa General Belgrano, sí tengo terreno", "Somos dos, en unos meses"],
    accionFinal: "CALIFICADO",
    maxMensajes: 5,
    datosEsperados: { nombre: "ana lópez", zona: "villa general belgrano" },
  },
  /* ----- Un solo turno ----- */
  { nombre: "familia: primer mensaje", espera: "RESPONDER: saluda y pide nombre y apellido + uso, con la lista de usos", historial: [c("Hola, quería info de las casas")] },
  { nombre: "precio solo", espera: "RESPONDER, sin número, pide nombre + uso", historial: [c("Precio?")] },
  { nombre: "recomendado", espera: "RESPONDER, agradece a Martín, origen RECOMENDACION", historial: [c("Hola, me pasó tu número Martín, me dijo que hacen casas modulares")] },
  {
    nombre: "precio insistente",
    espera: "DERIVAR: es la segunda insistencia con el precio",
    historial: [
      c("info de las casas"),
      b("¡Hola! Para empezar, ¿me decís tu nombre y apellido y para qué estás pensando la casa?"),
      c("No, decime cuánto sale la más chica, aunque sea aproximado"),
      b("Cada casa se arma a medida, Luciano te arma el presupuesto exacto. ¿Me decís tu nombre y apellido y para qué la querés?"),
      c("Pero dame un número, en dólares, más o menos"),
    ],
  },
  { nombre: "plazo y financiación", espera: "sin días ni financiación", historial: [c("Hola MOVARA, ¿en cuántos días la entregan y tienen cuotas?")] },
  { nombre: "técnico y permisos", espera: "sin datos técnicos ni permisos", historial: [c("Hola, quiero una casa modular. ¿Qué aislación tienen las paredes y necesito permiso municipal?")] },
  { nombre: "no es lead: proveedor", espera: "esLead false, NO_RESPONDER", historial: [c("Buenas, somos una agencia de marketing digital, ¿te interesa mejorar tus ventas con publicidad en redes?")] },
  { nombre: "no es lead: personal", espera: "esLead false, NO_RESPONDER", historial: [c("Che, ¿venís el sábado al asado de Juan?")] },
  {
    nombre: "enojado",
    espera: "DERIVAR, sin prometer hoy",
    historial: [c("info de las casas"), b("¡Hola! ¿Me decís tu nombre y apellido y para qué la estás pensando?"), c("Ya les escribí tres veces y nadie me contesta nada en serio, es una falta de respeto")],
  },
  { nombre: "quiere visitar con fecha", espera: "DERIVAR", historial: [c("Hola, vi el cartel en la ruta. ¿Puedo ir a ver el showroom el sábado a las 10?")] },
  { nombre: "pide humano", espera: "DERIVAR", historial: [c("Hola, quiero hablar con una persona por las casas")] },
  {
    nombre: "¿sos un bot?",
    espera: "admite: asistente de MOVARA, Luciano escribe después",
    historial: [c("Hola, quería info de las casas"), b("¡Hola! ¿Me decís tu nombre y apellido y para qué la estás pensando?"), c("Antes, ¿sos un bot o una persona? En serio")],
  },
  { nombre: "audio + texto", espera: "RESPONDER con el texto: toma alquilar + Sunchales, pide nombre", historial: [c("", "AUDIO"), c("Perdón, te mandé un audio. Busco una casa para alquilar en Sunchales")] },
];

const TITULOS_OPCIONES = Object.values(OPCIONES).flatMap((o) => o.interactivo.opciones.map((x) => x.titulo.toLowerCase()));

/** Reglas del bot que se pueden revisar de forma automática en un mensaje. */
function incumplimientos(texto: string): string[] {
  const f: string[] = [];
  if (/\p{Extended_Pictographic}/u.test(texto)) f.push("emoji");
  if (/^\s*([-*•]|\d+[.)])\s/m.test(texto)) f.push("lista");
  if ((texto.match(/\?/g) ?? []).length > 1) f.push("más de una pregunta");
  if (/(\$|usd|u\$s|d[oó]lares|pesos)\s*\d|\d[\d.,]*\s*(usd|u\$s|d[oó]lares|pesos)/i.test(texto)) f.push("precio");
  if (/\b\d+\s*(d[ií]as|semanas|meses)\b/i.test(texto)) f.push("plazo en días/semanas/meses");
  if (/\bhoy\b|en el d[ií]a|en (unas|pocas|\d+) (horas|minutos)|enseguida|ma[nñ]ana mismo/i.test(texto)) f.push("promete hoy o un plazo de respuesta");
  if (/\b(aislaci[oó]n|poliuretano|lana de vidrio|espesor|m2|m²|metros cuadrados|kw|garant[ií]a de \d)/i.test(texto)) f.push("dato técnico");
  if (/plegab/i.test(texto)) f.push("plegable");
  if (/producci[oó]n nacional|fabricaci[oó]n (nacional|argentina)|hech[oa] en argentina/i.test(texto)) f.push("producción nacional");
  if (/\b(cuotas?|materiales|tasa|descuentos?|flete)\b/i.test(texto)) f.push("nombra cuotas/materiales/descuento/flete");
  if (/habitual|com[uú]nmente|solemos|hicimos|hemos hecho|muchos clientes|nuestros clientes|clientes suelen|experiencia|trayectoria|a[nñ]os haciendo/i.test(texto)) f.push("afirma experiencia o casos anteriores");
  if (/qu[eé] lindo|zona linda|lugar lindo|qu[eé] buena idea|excelente elecci[oó]n|qu[eé] lindo proyecto/i.test(texto)) f.push("relleno o elogio genérico");
  if (TITULOS_OPCIONES.filter((t) => texto.toLowerCase().includes(t)).length >= 2) f.push("escribe las opciones de los botones en el texto");
  return f;
}

/** Reglas que dependen de la conversación y de la acción. */
function incumplimientosDeContexto(previosBot: string[], accion: string, texto: string, datosAntes: DatosCalificacion, datosDespues: DatosCalificacion): string[] {
  const f: string[] = [];
  if (previosBot.length && /^\s*¡?hola\b/i.test(texto)) f.push("vuelve a saludar");
  const personalmente = [...previosBot, texto].join(" ").match(/personalmente/gi)?.length ?? 0;
  if (personalmente > 1) f.push(`"personalmente" ${personalmente} veces en la conversación`);
  const preguntas = texto.match(/\?/g)?.length ?? 0;
  if (accion === "CALIFICADO" && preguntas) f.push("pregunta en CALIFICADO");
  if (accion === "DERIVAR") {
    if (!/luciano/i.test(texto) || !/(escrib|contact)/i.test(texto)) f.push("DERIVAR sin decir que Luciano le escribe");
    if (preguntas && !/nombre/i.test(texto)) f.push("pregunta en DERIVAR (que no es el nombre)");
  }
  const problema = problemaDeRespuesta(texto, datosDespues);
  if (problema?.repetidos.length) f.push(`vuelve a preguntar ${problema.repetidos.join(", ")} (ya obtenido)`);
  if (problema?.demasiados) f.push("pregunta más de dos datos");
  if (accion === "RESPONDER" && !datosAntes.nombre && !datosDespues.nombre && !camposPreguntados(texto).includes("nombre")) f.push("no pide el nombre (va al principio)");
  if (/nombre/i.test(texto) && texto.includes("?") && !/apellido|nombre completo/i.test(texto)) f.push("pide el nombre sin el apellido");
  const oraciones = texto.replace(/^\s*¡?hola!?[,.]?\s*/i, "").split(/[.!?]+/).filter((s) => s.trim()).length;
  if (accion !== "CALIFICADO" && oraciones > 3) f.push(`${oraciones} oraciones (máximo 3)`);
  return f;
}

type Fila = { caso: string; mensajesBot: number; regeneraciones: number; accion: string; datos: DatosCalificacion };

async function main() {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error("Falta ANTHROPIC_API_KEY en .env.local (o en la terminal).");
    process.exit(1);
  }
  const filtros = process.argv.slice(2).map((f) => f.toLowerCase());
  const casos = filtros.length ? CASOS.filter((x) => filtros.some((f) => x.nombre.toLowerCase().includes(f))) : CASOS;
  const motor = crearMotorClaude();
  let total = 0;
  const fallas: string[] = [];
  const respuestas: string[] = [];
  const tabla: Fila[] = [];
  console.log(`Modelo: ${MODELO_BOT} — ${casos.length} caso(s)\n`);

  for (const caso of casos) {
    console.log(`=== ${caso.nombre}  (se espera: ${caso.espera})`);
    const historial: MensajeHistorial[] = [...(caso.historial ?? [])];
    for (const m of historial) console.log(`  ${m.autor === "CLIENTE" ? "Cliente" : "MOVARA "}: ${m.tipo === "AUDIO" ? "[audio]" : m.contenido}`);
    const guion = [...(caso.guion ?? [])];
    const datos: DatosCalificacion = {};
    let mensajesBot = historial.filter((m) => m.autor === "BOT").length;
    let regeneraciones = 0;
    let accion = "—";
    const fallasCaso: string[] = [];

    for (let turno = 0; ; turno++) {
      if (caso.guion) {
        const siguiente = guion.shift();
        if (siguiente === undefined) break;
        for (const t of Array.isArray(siguiente) ? siguiente : [siguiente]) {
          historial.push(c(t));
          console.log(`  Cliente: ${t}`);
        }
      } else if (turno > 0) break;

      const datosAntes = { ...datos };
      const r = await generarTurno(motor, historial, { datos, mensajesBot }, caso.nombre);
      for (const uso of r.usos) total += costoDeLlamada(uso);
      if (!r.ok) {
        console.log(`  FALLÓ: ${r.motivo}`);
        fallasCaso.push(`la IA no respondió (${r.motivo})`);
        break;
      }
      accion = r.respuesta.accion;
      if (r.regenerado) regeneraciones++;
      // Como en producción: solo se completan los datos vacíos.
      for (const k of CAMPOS_CALIFICACION) if (!datos[k] && r.datos[k]) datos[k] = r.datos[k];
      if (r.respuesta.datosExtraidos.origen) datos.origen = r.respuesta.datosExtraidos.origen;

      if (accion === "NO_RESPONDER" || !r.respuesta.esLead) {
        console.log(`  MOVARA : [no responde] · esLead: ${r.respuesta.esLead}`);
        break;
      }
      const previosBot = historial.filter((m) => m.autor === "BOT").map((m) => m.contenido);
      console.log(`  MOVARA : ${r.texto}`);
      if (r.interactivo) console.log(`           [${r.interactivo.tipo === "lista" ? `Lista "${r.interactivo.boton}"` : "Botones"}: ${r.interactivo.opciones.map((o) => o.titulo).join(" | ")}]`);
      console.log(`           (${accion}${r.regenerado ? " · REGENERADA por el control de datos" : ""})`);
      const f = [...incumplimientos(r.texto), ...incumplimientosDeContexto(previosBot, accion, r.texto, datosAntes, r.datos)];
      if (turno === 0 && caso.empiezaCon && !r.texto.trim().replace(/^¡?hola!?[,.]?\s*/i, "").startsWith(caso.empiezaCon)) f.push(`no empieza con "${caso.empiezaCon}"`);
      if (f.length) {
        fallasCaso.push(`mensaje ${mensajesBot + 1}: ${f.join(", ")}`);
        console.log(`  ⚠ NO CUMPLE: ${f.join(", ")}`);
      }
      respuestas.push(r.texto);
      historial.push(b(contenidoConOpciones(r.texto, r.interactivo)));
      mensajesBot++;
      if (accion !== "RESPONDER") break;
    }

    if (caso.accionFinal && accion !== caso.accionFinal) fallasCaso.push(`terminó en ${accion} (se esperaba ${caso.accionFinal})`);
    if (caso.guion && guion.length) fallasCaso.push(`cerró con ${guion.length} turno(s) del cliente sin usar`);
    if (caso.maxMensajes && mensajesBot > caso.maxMensajes) fallasCaso.push(`${mensajesBot} mensajes del bot (se esperaban hasta ${caso.maxMensajes})`);
    for (const [k, v] of Object.entries(caso.datosEsperados ?? {})) {
      const real = String(datos[k] ?? "").toLowerCase();
      if (!real || (v && !real.includes(v))) fallasCaso.push(`dato ${k} = "${datos[k] ?? ""}"${v ? ` (se esperaba "${v}")` : " (falta)"}`);
    }
    const d = Object.entries(datos).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("; ");
    console.log(`Datos: ${d || "—"}`);
    if (fallasCaso.length) {
      fallas.push(`${caso.nombre}: ${fallasCaso.join(" · ")}`);
      console.log(`⚠ ${fallasCaso.join(" · ")}`);
    }
    tabla.push({ caso: caso.nombre, mensajesBot, regeneraciones, accion, datos: { ...datos } });
    console.log("");
  }

  console.log("=== Datos extraídos");
  console.log(["caso", ...CAMPOS_CALIFICACION, "msjs bot", "regen.", "acción"].join(" | "));
  for (const t of tabla) console.log([t.caso, ...CAMPOS_CALIFICACION.map((k) => t.datos[k] ?? "—"), t.mensajesBot, t.regeneraciones, t.accion].join(" | "));
  const formula = respuestas.filter((x) => /qu[eé] bueno que nos escribas/i.test(x)).length;
  if (formula > 2) fallas.push(`"Qué bueno que nos escribas" en ${formula} respuestas (máximo 2)`);
  const usoFrases = FRASES_DERIVACION.map((x) => `${respuestas.filter((y) => y.includes(x)).length}× "${x}"`);
  console.log(`\nFrases de derivación usadas: ${usoFrases.join(" · ")}`);
  console.log(`Regeneraciones por el control de datos: ${tabla.reduce((a, t) => a + t.regeneraciones, 0)}`);
  console.log(`Costo total: USD ${total.toFixed(4)}`);
  console.log(fallas.length ? `\nIncumplimientos (${fallas.length}):\n${fallas.map((x) => `- ${x}`).join("\n")}` : "\nSin incumplimientos automáticos.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.name : "Error");
  process.exit(1);
});
