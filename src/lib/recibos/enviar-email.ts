import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { LOCAL_STORAGE_DIR } from "@/lib/admin/storage";
import { EMAIL_CONTACTO_MOVARA } from "./constantes";

export type AdjuntoEmail = { filename: string; content: Buffer };
export type EmailRecibo = { to: string; subject: string; html: string; attachments?: AdjuntoEmail[] };
export type ResultadoEmail = { ok: true } | { ok: false; error: string };

export const OUTBOX_DIR = path.join(LOCAL_STORAGE_DIR, "outbox");

/** Recibos de prueba: fuera de producción, si el cliente tiene un email de
 * los dominios reservados example.com/.org/.net (RFC 2606, nunca reciben
 * correo), TODOS los emails de ese recibo — incluida la copia a MOVARA — van
 * a una bandeja local en vez de a Resend. Así el e2e cubre el flujo
 * completo sin mandar emails reales. */
export function esReciboDePrueba(clienteEmail: string): boolean {
  return process.env.NODE_ENV !== "production" && /@example\.(com|org|net)$/i.test(clienteEmail.trim());
}

async function guardarEnOutbox(email: EmailRecibo): Promise<void> {
  await mkdir(OUTBOX_DIR, { recursive: true });
  const id = `${Date.now()}-${randomUUID()}`;
  const adjuntos = (email.attachments ?? []).map((a, i) => ({ filename: a.filename, archivo: `${id}-${i}-${a.filename}`, bytes: a.content.length }));
  await Promise.all((email.attachments ?? []).map((a, i) => writeFile(path.join(OUTBOX_DIR, adjuntos[i].archivo), a.content)));
  await writeFile(
    path.join(OUTBOX_DIR, `${id}.json`),
    JSON.stringify({ to: email.to, subject: email.subject, html: email.html, adjuntos }, null, 2)
  );
}

/** Envía un email del Recibo en Conformidad. Resend v6 no lanza excepciones
 * ante errores de la API — devuelve `{ error }` —, así que se revisa
 * explícitamente; el try/catch cubre los errores de red. Nunca lanza: el
 * resultado indica si salió o por qué no. */
export async function enviarEmailRecibo(email: EmailRecibo, opciones: { prueba: boolean }): Promise<ResultadoEmail> {
  if (opciones.prueba) {
    try {
      await guardarEnOutbox(email);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: `No se pudo guardar en la bandeja local: ${(err as Error).message}` };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurado" };
  const from = process.env.RESEND_FROM_EMAIL ?? "MOVARA <onboarding@resend.dev>";

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: email.to,
      replyTo: EMAIL_CONTACTO_MOVARA,
      subject: email.subject,
      html: email.html,
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    });
    if (error) return { ok: false, error: `${error.name ?? "error"}: ${error.message}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
