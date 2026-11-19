/**
 * Chatear con el bot en local sin Meta: manda webhooks firmados como los de
 * WhatsApp a tu servidor de desarrollo.
 *
 *   1. En .env.local (NUNCA en Vercel): WHATSAPP_APP_SECRET=un-secreto-local,
 *      WHATSAPP_SIMULADO=1 y, sin clave de Claude, BOT_IA_SIMULADA=1.
 *   2. npm run dev
 *   3. npx tsx scripts/simular-whatsapp.ts 5493490000001 "Hola, quería info de las casas"
 *
 * La respuesta aparece en /admin/bot-whatsapp (unos 10-30 s, por la demora).
 * Opciones: --audio (manda un audio), --url http://localhost:3000.
 */
import { firmar } from "../src/lib/whatsapp-cloud/firma";

const args = process.argv.slice(2);
const audio = args.includes("--audio");
const iUrl = args.indexOf("--url");
const base = iUrl >= 0 ? args[iUrl + 1] : "http://localhost:3000";
const [telefono, ...resto] = args.filter((a, i) => !a.startsWith("--") && (iUrl < 0 || i !== iUrl + 1));
const texto = resto.join(" ");
const secreto = process.env.WHATSAPP_APP_SECRET;

if (!telefono || (!texto && !audio) || !secreto) {
  console.error('Uso: WHATSAPP_APP_SECRET=... npx tsx scripts/simular-whatsapp.ts <telefono 549…> "<mensaje>" [--audio] [--url …]');
  process.exit(1);
}

const id = `wamid.local.${Date.now()}`;
const mensaje = audio
  ? { from: telefono, id, timestamp: String(Math.floor(Date.now() / 1000)), type: "audio", audio: { id: "audio-local" } }
  : { from: telefono, id, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: texto } };
const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: { messaging_product: "whatsapp", contacts: [{ wa_id: telefono, profile: { name: "Prueba" } }], messages: [mensaje] } }] }],
});

const res = await fetch(`${base}/api/whatsapp/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Hub-Signature-256": firmar(body, secreto) },
  body,
});
console.log(`HTTP ${res.status}`, await res.text());
