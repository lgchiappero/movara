import { escapeHtml } from "@/lib/email/escape-html";
import { WHATSAPP_MOVARA_NUMERO, WHATSAPP_MOVARA_VISIBLE } from "@/lib/recibos/constantes";

const NEGRO = "#1A1A1A";
const DORADO = "#D4B36A";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

export type DatosEmailRecibo = {
  numeroRecibo: string;
  clienteNombre: string;
  numeroUnidad: string;
  modelo: string;
  fechaEntregaTexto: string; // "8 de octubre de 2026"
  lugarEntrega: string;
  observaciones: string | null;
};

/** Primer nombre para el saludo ("Ana García" → "Ana"). */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

function layout(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F0EB;font-family:${SANS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F0EB;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:${NEGRO};padding:28px 24px;text-align:center;border-radius:12px 12px 0 0;">
          <span style="font-family:${SERIF};color:${DORADO};font-size:24px;letter-spacing:8px;">MOVARA</span>
        </td></tr>
        <tr><td style="background:#FFFFFF;padding:32px 28px;border-radius:0 0 12px 12px;">
          ${contenido}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function filaDetalle(label: string, valor: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#8A8A8A;font-size:13px;width:110px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:${NEGRO};font-size:13px;font-weight:600;">${escapeHtml(valor)}</td>
  </tr>`;
}

function bloqueDetalle(d: DatosEmailRecibo): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:#FAF8F3;border-left:3px solid ${DORADO};border-radius:6px;padding:12px 16px;margin:20px 0;">
    ${filaDetalle("Unidad", d.numeroUnidad)}
    ${filaDetalle("Modelo", d.modelo)}
    ${filaDetalle("Fecha", d.fechaEntregaTexto)}
    ${filaDetalle("Lugar", d.lugarEntrega)}
    ${filaDetalle("Observaciones", d.observaciones?.trim() || "Sin observaciones")}
  </table>`;
}

/** Email al cliente con el botón de confirmación. */
export function buildEmailSolicitudRecibo(d: DatosEmailRecibo, link: string): { subject: string; html: string } {
  const html = layout(`
    <p style="margin:0 0 6px;font-family:${SERIF};font-size:22px;color:${NEGRO};">Hola ${escapeHtml(primerNombre(d.clienteNombre))}, tu MOVARA ya está en destino</p>
    <p style="margin:12px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Te pedimos que confirmes que recibiste la unidad en conformidad. Con esa confirmación arranca tu garantía.
    </p>
    ${bloqueDetalle(d)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 20px;">
      <a href="${escapeHtml(link)}"
         style="display:inline-block;background:${DORADO};color:${NEGRO};text-decoration:none;font-weight:700;font-size:14px;padding:14px 24px;border-radius:10px;">
        Confirmo que recibí la unidad en conformidad
      </a>
    </td></tr></table>
    <p style="margin:0;color:#8A8A8A;font-size:12px;line-height:1.6;">
      Si algo no está bien, no confirmes y respondé este email o escribinos por WhatsApp al
      <a href="https://wa.me/${WHATSAPP_MOVARA_NUMERO}" style="color:${NEGRO};">${WHATSAPP_MOVARA_VISIBLE}</a>.
    </p>
    <p style="margin:16px 0 0;color:#B0B0B0;font-size:11px;">Recibo en Conformidad Nº ${escapeHtml(d.numeroRecibo)}</p>
  `);
  return { subject: `Confirmá la recepción de tu MOVARA · ${d.numeroRecibo}`, html };
}

/** Copia del recibo confirmado (con el PDF adjunto) — al cliente o a MOVARA. */
export function buildEmailReciboConfirmado(
  d: DatosEmailRecibo & { confirmadoTexto: string; garantiaHastaTexto: string },
  para: "cliente" | "movara"
): { subject: string; html: string } {
  const intro =
    para === "cliente"
      ? `<p style="margin:0 0 6px;font-family:${SERIF};font-size:22px;color:${NEGRO};">Gracias, ${escapeHtml(primerNombre(d.clienteNombre))}</p>
         <p style="margin:12px 0 0;color:#555;font-size:14px;line-height:1.6;">
           Confirmaste la recepción de tu MOVARA el ${escapeHtml(d.confirmadoTexto)}. Te adjuntamos el Recibo en Conformidad.
           Tu garantía está vigente hasta el ${escapeHtml(d.garantiaHastaTexto)}.
         </p>`
      : `<p style="margin:0 0 6px;font-family:${SERIF};font-size:22px;color:${NEGRO};">Recibo en Conformidad confirmado</p>
         <p style="margin:12px 0 0;color:#555;font-size:14px;line-height:1.6;">
           ${escapeHtml(d.clienteNombre)} confirmó la recepción el ${escapeHtml(d.confirmadoTexto)}. Garantía vigente hasta el ${escapeHtml(d.garantiaHastaTexto)}. PDF adjunto.
         </p>`;
  const html = layout(`
    ${intro}
    ${bloqueDetalle(d)}
    <p style="margin:0;color:#8A8A8A;font-size:12px;line-height:1.6;">
      Ante cualquier consulta, respondé este email o escribinos por WhatsApp al
      <a href="https://wa.me/${WHATSAPP_MOVARA_NUMERO}" style="color:${NEGRO};">${WHATSAPP_MOVARA_VISIBLE}</a>.
    </p>
  `);
  const subject =
    para === "cliente"
      ? `Tu Recibo en Conformidad · ${d.numeroRecibo}`
      : `Recibo en Conformidad confirmado · ${d.numeroRecibo} · ${d.clienteNombre}`;
  return { subject, html };
}
