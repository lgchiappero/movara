// Prueba el prompt del bot de WhatsApp con la API REAL de Claude (gasta
// crédito: unos centavos). No toca la base ni WhatsApp: solo llama a
// crearMotorClaude con conversaciones armadas y muestra respuesta, acción,
// datos extraídos, tokens y costo.
//
//   npx tsx scripts/probar-prompt-bot.ts            (todos los casos)
//   npx tsx scripts/probar-prompt-bot.ts familia     (los que contienen "familia")
//
// Necesita ANTHROPIC_API_KEY en .env.local o en la terminal. Nunca la imprime.
import "./_env";
import { crearMotorClaude, MODELO_BOT, type MensajeHistorial } from "../src/lib/bot-whatsapp/ia";
import { costoDeLlamada } from "../src/lib/bot-whatsapp/gasto";
import { FRASES_DERIVACION } from "../src/lib/bot-whatsapp/prompt";

const c = (contenido: string, tipo: MensajeHistorial["tipo"] = "TEXTO"): MensajeHistorial => ({ autor: "CLIENTE", tipo, contenido });
const b = (contenido: string): MensajeHistorial => ({ autor: "BOT", tipo: "TEXTO", contenido });

type Caso = { nombre: string; espera: string; historial: MensajeHistorial[]; datos?: Record<string, string>; empiezaCon?: string };

const CASOS: Caso[] = [
  { nombre: "familia-1 primer mensaje", espera: "RESPONDER, pregunta para qué la piensa", historial: [c("Hola, quería info de las casas")] },
  {
    nombre: "familia-2 a mitad de camino",
    espera: "RESPONDER, valora terreno, menciona showroom/cercanía, pregunta plazo",
    historial: [
      c("Hola, quería info de las casas"),
      b("¡Hola! Qué bueno que nos escribas. Contame, ¿la pensás para vivir, para alquilar…?"),
      c("Para vivir con mi pareja y mi nena"),
      b("Para una familia de tres quedan muy cómodas, llegan terminadas y listas para entrar a vivir. ¿Por qué zona sería?"),
      c("Rafaela, ya tenemos el terreno"),
    ],
  },
  {
    nombre: "familia-3 da el nombre",
    espera: "CALIFICADO, agradece y cierra con Luciano",
    historial: [
      c("Hola, quería info de las casas"),
      b("¡Hola! Qué bueno que nos escribas. Contame, ¿la pensás para vivir, para alquilar…?"),
      c("Para vivir con mi pareja y mi nena"),
      b("Para tres quedan muy cómodas. ¿Por qué zona sería?"),
      c("Rafaela, ya tenemos el terreno"),
      b("Buenísimo, con terreno ya tienen lo más difícil. ¿Para cuándo se imaginan estar viviendo ahí?"),
      c("Para mitad del año que viene"),
      b("Perfecto, hay tiempo de sobra. ¿Me decís tu nombre así le paso todo a Luciano?"),
      c("Sofía"),
    ],
  },
  { nombre: "precio solo", espera: "RESPONDER, sin número, pregunta para qué", historial: [c("Precio?")] },
  { nombre: "recomendado", espera: "RESPONDER, agradece a Martín, origen RECOMENDACION", historial: [c("Hola, me pasó tu número Martín, me dijo que hacen casas modulares")] },
  { nombre: "precio insistente", espera: "DERIVAR: es la segunda insistencia con el precio", historial: [c("info de las casas"), b("¡Hola! ¿Para qué la estás pensando?"), c("No, decime cuánto sale la más chica, aunque sea aproximado"), b("Cada casa se arma a medida, Luciano te arma el presupuesto exacto. ¿Por qué zona sería?"), c("Pero dame un número, en dólares, más o menos")] },
  { nombre: "plazo y financiación", espera: "sin días ni financiación", historial: [c("Hola MOVARA, ¿en cuántos días la entregan y tienen cuotas?")] },
  { nombre: "técnico y permisos", espera: "sin datos técnicos ni permisos", historial: [c("Hola, quiero una casa modular. ¿Qué aislación tienen las paredes y necesito permiso municipal?")] },
  { nombre: "no es lead: proveedor", espera: "esLead false, NO_RESPONDER", historial: [c("Buenas, somos una agencia de marketing digital, ¿te interesa mejorar tus ventas con publicidad en redes?")] },
  { nombre: "no es lead: personal", espera: "esLead false, NO_RESPONDER", historial: [c("Che, ¿venís el sábado al asado de Juan?")] },
  { nombre: "enojado", espera: "DERIVAR, frase de derivación", historial: [c("info de las casas"), b("¡Hola! ¿Para qué la pensás?"), c("Ya les escribí tres veces y nadie me contesta nada en serio, es una falta de respeto")] },
  { nombre: "quiere visitar con fecha", espera: "DERIVAR", historial: [c("Hola, vi el cartel en la ruta. ¿Puedo ir a ver el showroom el sábado a las 10?")] },
  { nombre: "pide humano", espera: "DERIVAR", historial: [c("Hola, quiero hablar con una persona por las casas")] },
  { nombre: "¿sos un bot?", espera: "admite: asistente de MOVARA, Luciano escribe después", historial: [c("Hola, quería info de las casas"), b("¡Hola! ¿Para qué la estás pensando?"), c("Antes, ¿sos un bot o una persona? En serio")] },
  {
    nombre: "empresa constructora: 4 módulos para un obrador",
    espera: "RESPONDER: empieza con 'Sí', uso obrador/empresa, sin precio ni plazos; pregunta zona (no el nombre)",
    empiezaCon: "Sí",
    historial: [c("Buenas, somos una constructora y necesitamos 4 módulos para armar un obrador en una obra nueva. ¿Trabajan con empresas?")],
  },
  { nombre: "audio + texto", espera: "RESPONDER con el texto", historial: [c("", "AUDIO"), c("Perdón, te mandé un audio. Busco una casa para alquilar en Sunchales")] },
];

/** Reglas del bot que se pueden revisar de forma automática. */
function incumplimientos(texto: string): string[] {
  const f: string[] = [];
  if (/\p{Extended_Pictographic}/u.test(texto)) f.push("emoji");
  if (/^\s*([-*•]|\d+[.)])\s/m.test(texto)) f.push("lista");
  if ((texto.match(/\?/g) ?? []).length > 1) f.push("más de una pregunta");
  if (/(\$|usd|u\$s|d[oó]lares|pesos)\s*\d|\d[\d.,]*\s*(usd|u\$s|d[oó]lares|pesos)/i.test(texto)) f.push("precio");
  if (/\b\d+\s*(d[ií]as|semanas|meses)\b/i.test(texto)) f.push("plazo en días/semanas/meses");
  if (/\b(aislaci[oó]n|poliuretano|lana de vidrio|espesor|m2|m²|metros cuadrados|kw|garant[ií]a de \d)/i.test(texto)) f.push("dato técnico");
  if (/plegab/i.test(texto)) f.push("plegable");
  if (/producci[oó]n nacional|fabricaci[oó]n (nacional|argentina)|hech[oa] en argentina/i.test(texto)) f.push("producción nacional");
  if (/\b(cuotas?|materiales|tasa|descuentos?|flete)\b/i.test(texto)) f.push("nombra cuotas/materiales/descuento/flete");
  if (/habitual|com[uú]nmente|solemos|hicimos|hemos hecho|muchos clientes|nuestros clientes|clientes suelen|experiencia|trayectoria|a[nñ]os haciendo/i.test(texto)) f.push("afirma experiencia o casos anteriores");
  if (/qu[eé] lindo|zona linda|lugar lindo|qu[eé] buena idea|excelente elecci[oó]n|qu[eé] lindo proyecto/i.test(texto)) f.push("relleno o elogio genérico");
  return f;
}

/** Reglas que dependen de la conversación y de la acción. */
function incumplimientosDeContexto(caso: Caso, accion: string, texto: string, datos: Record<string, unknown>): string[] {
  const f: string[] = [];
  const previosBot = caso.historial.filter((m) => m.autor === "BOT").map((m) => m.contenido);
  if (previosBot.length && /^\s*¡?hola\b/i.test(texto)) f.push("vuelve a saludar");
  const personalmente = [...previosBot, texto].join(" ").match(/personalmente/gi)?.length ?? 0;
  if (personalmente > 1) f.push(`"personalmente" ${personalmente} veces en la conversación`);
  const preguntas = texto.match(/\?/g)?.length ?? 0;
  if (accion === "CALIFICADO") {
    if (preguntas) f.push("pregunta en CALIFICADO");
    const oraciones = texto.split(/[.!]+/).filter((s) => s.trim()).length;
    if (oraciones > 2) f.push(`CALIFICADO con ${oraciones} oraciones`);
  }
  if (accion === "DERIVAR") {
    if (!/luciano/i.test(texto) || !/(escrib|contact)/i.test(texto)) f.push("DERIVAR sin decir que Luciano le escribe");
    if (preguntas && !/nombre/i.test(texto)) f.push("pregunta en DERIVAR (que no es el nombre)");
  }
  if (accion === "RESPONDER" && /nombre/i.test(texto) && texto.includes("?")) {
    const faltan = ["uso", "zona", "terreno", "personas", "plazo"].filter((k) => !datos[k]);
    if (faltan.length) f.push(`pide el nombre antes de tiempo (faltan ${faltan.join(", ")})`);
  }
  const oracionesTotales = texto.replace(/^\s*¡?hola!?[,.]?\s*/i, "").split(/[.!?]+/).filter((s) => s.trim()).length;
  if (oracionesTotales > 3) f.push(`${oracionesTotales} oraciones (máximo 3)`);
  const pregunta = texto.includes("?") ? texto.slice(texto.lastIndexOf(".", texto.indexOf("?")) + 1) : "";
  if (datos.uso && /para qu[eé] (la|lo|uso|tipo)|\buso\b|(vivir|alquilar),? o |o para (vivir|alquilar)|pens[aá]s usar|como vivienda/i.test(pregunta)) f.push("vuelve a preguntar el uso");
  if (datos.zona && /zona|d[oó]nde/i.test(pregunta)) f.push("vuelve a preguntar la zona");
  if (caso.empiezaCon && !texto.trim().replace(/^¡?hola!?[,.]?\s*/i, "").startsWith(caso.empiezaCon)) f.push(`no empieza con "${caso.empiezaCon}"`);
  return f;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error("Falta ANTHROPIC_API_KEY en .env.local (o en la terminal).");
    process.exit(1);
  }
  const filtro = process.argv[2]?.toLowerCase();
  const casos = filtro ? CASOS.filter((x) => x.nombre.toLowerCase().includes(filtro)) : CASOS;
  const motor = crearMotorClaude();
  let total = 0;
  const fallas: string[] = [];
  const respuestas: string[] = [];
  console.log(`Modelo: ${MODELO_BOT} — ${casos.length} caso(s)\n`);
  for (const caso of casos) {
    const r = await motor.responder(caso.historial, caso.datos ?? {});
    const costo = r.uso ? costoDeLlamada(r.uso) : 0;
    total += costo;
    console.log(`=== ${caso.nombre}  (se espera: ${caso.espera})`);
    for (const m of caso.historial) console.log(`  ${m.autor === "CLIENTE" ? "Cliente" : "MOVARA "}: ${m.tipo === "AUDIO" ? "[audio]" : m.contenido}`);
    if (!r.ok) {
      console.log(`FALLÓ: ${r.motivo}`);
      fallas.push(`${caso.nombre}: la IA no respondió (${r.motivo})`);
    } else {
      const d = Object.entries(r.respuesta.datosExtraidos).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("; ");
      console.log(`  MOVARA : ${r.respuesta.respuesta || "[no responde]"}`);
      console.log(`Acción: ${r.respuesta.accion} · esLead: ${r.respuesta.esLead}`);
      const f = [...incumplimientos(r.respuesta.respuesta), ...incumplimientosDeContexto(caso, r.respuesta.accion, r.respuesta.respuesta, r.respuesta.datosExtraidos)];
      respuestas.push(r.respuesta.respuesta);
      if (f.length) {
        fallas.push(`${caso.nombre}: ${f.join(", ")}`);
        console.log(`⚠ NO CUMPLE: ${f.join(", ")}`);
      }
      console.log(`Datos: ${d || "—"}`);
      console.log(`Motivo: ${r.respuesta.motivo}`);
    }
    if (r.uso) {
      console.log(
        `Tokens: entrada ${r.uso.input_tokens}, salida ${r.uso.output_tokens}, caché escrita ${r.uso.cache_creation_input_tokens ?? 0}, caché leída ${r.uso.cache_read_input_tokens ?? 0} — USD ${costo.toFixed(5)}`,
      );
    }
    console.log("");
  }
  // Variedad entre conversaciones: la misma fórmula de arranque no más de 2 veces.
  const formula = respuestas.filter((x) => /qu[eé] bueno que nos escribas/i.test(x)).length;
  if (formula > 2) fallas.push(`"Qué bueno que nos escribas" en ${formula} respuestas (máximo 2)`);
  const usoFrases = FRASES_DERIVACION.map((x) => `${respuestas.filter((y) => y.includes(x)).length}× "${x}"`);
  console.log(`Frases de derivación usadas: ${usoFrases.join(" · ")}`);
  console.log(`Costo total: USD ${total.toFixed(4)}`);
  console.log(fallas.length ? `\nIncumplimientos (${fallas.length}):\n${fallas.map((x) => `- ${x}`).join("\n")}` : "\nSin incumplimientos automáticos.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.name : "Error");
  process.exit(1);
});
