import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { LOCAL_STORAGE_DIR } from "@/lib/admin/storage";
import { resumenError } from "@/lib/log-seguro";

export type AdjuntoEmail = { filename: string; content: Buffer };
export type Email = { to: string; subject: string; html: string; replyTo?: string; attachments?: AdjuntoEmail[] };
/** `error` es solo el TIPO de falla (ej. "validation_error (422)",
 * "sin_api_key", "TypeError") — nunca el mensaje de Resend, que puede
 * incluir la dirección de destino. Apto para logs y para mostrar en el panel. */
export type ResultadoEmail = { ok: true } | { ok: false; error: string };

export const OUTBOX_DIR = path.join(LOCAL_STORAGE_DIR, "outbox");

/** Emails de prueba: fuera de producción, los destinatarios de los dominios
 * reservados example.com/.org/.net (RFC 2606, nunca reciben correo) van a una
 * bandeja local en vez de a Resend. Así el e2e cubre flujos completos sin
 * mandar emails reales. */
export function esEmailDePrueba(email: string): boolean {
  return process.env.NODE_ENV !== "production" && /@example\.(com|org|net)$/i.test(email.trim());
}

async function guardarEnOutbox(email: Email): Promise<void> {
  await mkdir(OUTBOX_DIR, { recursive: true });
  const id = `${Date.now()}-${randomUUID()}`;
  const adjuntos = (email.attachments ?? []).map((a, i) => ({ filename: a.filename, archivo: `${id}-${i}-${a.filename}`, bytes: a.content.length }));
  await Promise.all((email.attachments ?? []).map((a, i) => writeFile(path.join(OUTBOX_DIR, adjuntos[i].archivo), a.content)));
  await writeFile(
    path.join(OUTBOX_DIR, `${id}.json`),
    JSON.stringify({ to: email.to, subject: email.subject, html: email.html, adjuntos }, null, 2)
  );
}

/** Único punto de envío de emails. Resend v6 no lanza ante errores de la API
 * — devuelve `{ error }` —, así que se revisa explícitamente; el try/catch
 * cubre los errores de red. Nunca lanza: el resultado indica si salió. */
export async function enviarEmail(email: Email, opciones: { prueba?: boolean } = {}): Promise<ResultadoEmail> {
  if (opciones.prueba) {
    try {
      await guardarEnOutbox(email);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: `outbox: ${resumenError(err)}` };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "sin_api_key" };
  const from = process.env.RESEND_FROM_EMAIL ?? "MOVARA <onboarding@resend.dev>";

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
      ...(email.attachments ? { attachments: email.attachments.map((a) => ({ filename: a.filename, content: a.content })) } : {}),
    });
    if (error) {
      return { ok: false, error: `${error.name || "error"}${typeof error.statusCode === "number" ? ` (${error.statusCode})` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: resumenError(err) };
  }
}
