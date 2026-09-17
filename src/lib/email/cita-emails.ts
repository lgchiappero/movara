import { SHOWROOM_DIRECCION, SHOWROOM_WHATSAPP } from "@/lib/agenda/showroom";
import { fechaKeyToDate, dateToFechaKey } from "@/lib/agenda/fecha";

export type CitaEmailData = {
  id: string;
  fecha: Date;
  horario: string;
  nombre: string;
  email: string;
  telefono: string;
  tipoCliente: string;
  razonSocial: string | null;
  consulta: string;
  canceladaPor?: string | null;
  motivoCancelacion?: string | null;
};

function fechaEs(fecha: Date): string {
  // `fecha` viene de Prisma como Date a medianoche UTC — se re-normaliza
  // por la key para no correr el día si el server no corre en UTC.
  return fechaKeyToDate(dateToFechaKey(fecha)).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function cancelUrl(id: string): string {
  return `https://movara.com.ar/agendar/cancelar/${id}`;
}

function layout(preheader: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
      <p style="margin:0;color:#D4B06A;font-size:18px;font-weight:bold;">${preheader}</p>
    </div>
    <div style="padding:24px;">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

export function buildConfirmacionClienteEmail(cita: CitaEmailData): { subject: string; html: string } {
  const html = layout(
    "MOVARA — Visita confirmada",
    `
    <p style="margin:0 0 12px;color:#222;font-size:15px;">Hola ${cita.nombre},</p>
    <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">Tu visita al showroom MOVARA está confirmada.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;color:#888;width:110px">Fecha</td><td style="padding:8px 0;color:#222;font-weight:600">${fechaEs(cita.fecha)}</td></tr>
      <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;color:#888">Horario</td><td style="padding:8px 0;color:#222;font-weight:600">${cita.horario} hs</td></tr>
      <tr><td style="padding:8px 0;color:#888">Dónde</td><td style="padding:8px 0;color:#222">${SHOWROOM_DIRECCION}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">Te pedimos llegar 5 minutos antes de la hora agendada.</p>
    <div style="padding:14px 16px;background:#f9f5ee;border-left:4px solid #D4B06A;border-radius:4px;font-size:13px;color:#555;line-height:1.6;">
      Si no podés asistir, cancelá tu turno en <a href="${cancelUrl(cita.id)}" style="color:#D4B06A;">movara.com.ar/agendar/cancelar/${cita.id}</a> o avisanos por WhatsApp al ${SHOWROOM_WHATSAPP}. Es importante porque hay otras personas esperando ese turno.
    </div>
    <p style="margin:20px 0 0;color:#888;font-size:13px;">— El equipo MOVARA</p>
    `
  );
  return { subject: "MOVARA — Tu visita está confirmada", html };
}

export function buildNuevaVisitaAdminEmail(cita: CitaEmailData): { subject: string; html: string } {
  const rows: [string, string][] = [
    ["Fecha", fechaEs(cita.fecha)],
    ["Horario", `${cita.horario} hs`],
    ["Tipo", cita.tipoCliente === "empresa" ? "Empresa" : "Particular"],
    ["Nombre", cita.nombre],
    ["Email", cita.email],
    ["Teléfono", cita.telefono],
    ...(cita.razonSocial ? ([["Razón social", cita.razonSocial]] as [string, string][]) : []),
    ...(cita.consulta.trim() ? ([["Qué busca", cita.consulta]] as [string, string][]) : []),
  ];
  const html = layout(
    "📅 Nueva visita agendada",
    `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${rows
        .map(
          ([label, value]) => `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 0;color:#888;width:130px;vertical-align:top">${label}</td>
        <td style="padding:10px 0;color:#222;font-weight:500;white-space:pre-wrap">${value}</td>
      </tr>`
        )
        .join("")}
    </table>
    `
  );
  return { subject: "MOVARA — Nueva visita agendada", html };
}

export function buildRecordatorioEmail(cita: CitaEmailData): { subject: string; html: string } {
  const html = layout(
    "MOVARA — Recordatorio de visita",
    `
    <p style="margin:0 0 12px;color:#222;font-size:15px;">Hola ${cita.nombre},</p>
    <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.6;">Te recordamos tu visita al showroom MOVARA <strong>mañana</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;color:#888;width:110px">Fecha</td><td style="padding:8px 0;color:#222;font-weight:600">${fechaEs(cita.fecha)}</td></tr>
      <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px 0;color:#888">Horario</td><td style="padding:8px 0;color:#222;font-weight:600">${cita.horario} hs</td></tr>
      <tr><td style="padding:8px 0;color:#888">Dónde</td><td style="padding:8px 0;color:#222">${SHOWROOM_DIRECCION}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">Te pedimos llegar 5 minutos antes de la hora agendada.</p>
    <div style="padding:14px 16px;background:#f9f5ee;border-left:4px solid #D4B06A;border-radius:4px;font-size:13px;color:#555;line-height:1.6;">
      Si no podés asistir, cancelá tu turno en <a href="${cancelUrl(cita.id)}" style="color:#D4B06A;">movara.com.ar/agendar/cancelar/${cita.id}</a> o avisanos por WhatsApp al ${SHOWROOM_WHATSAPP}.
    </div>
    <p style="margin:20px 0 0;color:#888;font-size:13px;">— El equipo MOVARA</p>
    `
  );
  return { subject: "MOVARA — Recordatorio: tu visita es mañana", html };
}

export function buildCancelacionClienteEmail(cita: CitaEmailData): { subject: string; html: string } {
  const motivo = cita.motivoCancelacion?.trim();
  const html = layout(
    "MOVARA — Visita cancelada",
    `
    <p style="margin:0 0 12px;color:#222;font-size:15px;">Hola ${cita.nombre},</p>
    <p style="margin:0 0 ${motivo ? "12px" : "0"};color:#555;font-size:15px;line-height:1.6;">Confirmamos que cancelaste tu visita del ${fechaEs(cita.fecha)} a las ${cita.horario} hs. Cuando quieras, podés agendar un nuevo turno en movara.com.ar/agendar.</p>
    ${motivo ? `<div style="padding:12px 16px;background:#f9f5ee;border-left:4px solid #D4B06A;border-radius:4px;font-size:13px;color:#555;">Motivo: ${motivo}</div>` : ""}
    <p style="margin:20px 0 0;color:#888;font-size:13px;">— El equipo MOVARA</p>
    `
  );
  return { subject: "MOVARA — Tu visita fue cancelada", html };
}

export type ReagendacionEmailData = {
  nombre: string;
  email: string;
  telefono: string;
  fechaAnterior: Date;
  horarioAnterior: string;
  fechaNueva: Date;
  horarioNueva: string;
};

export function buildReagendacionAdminEmail(
  data: ReagendacionEmailData
): { subject: string; html: string } {
  const html = layout(
    "🔄 Reagendación de visita",
    `
    <p style="margin:0 0 16px;color:#555;font-size:14px;">${data.nombre} reagendó su visita.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 0;color:#888;width:150px;vertical-align:top">Cita cancelada</td>
        <td style="padding:10px 0;color:#222;font-weight:500">${fechaEs(data.fechaAnterior)} a las ${data.horarioAnterior} hs</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 0;color:#888;vertical-align:top">Nueva cita</td>
        <td style="padding:10px 0;color:#222;font-weight:600">${fechaEs(data.fechaNueva)} a las ${data.horarioNueva} hs</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;vertical-align:top">Contacto</td>
        <td style="padding:10px 0;color:#222;font-weight:500">${data.email} | ${data.telefono}</td>
      </tr>
    </table>
    `
  );
  return { subject: "MOVARA — Reagendación de visita", html };
}

export function buildCancelacionAdminEmail(cita: CitaEmailData): { subject: string; html: string } {
  const canceladoPorTxt = cita.canceladaPor === "admin" ? "el equipo MOVARA" : "el cliente";
  const rows: [string, string][] = [
    ["Fecha", fechaEs(cita.fecha)],
    ["Horario", `${cita.horario} hs`],
    ["Nombre", cita.nombre],
    ["Email", cita.email],
    ["Teléfono", cita.telefono],
    ...(cita.motivoCancelacion?.trim() ? ([["Motivo", cita.motivoCancelacion.trim()]] as [string, string][]) : []),
  ];
  const html = layout(
    "❌ Visita cancelada",
    `
    <p style="margin:0 0 16px;color:#555;font-size:14px;">Se canceló una visita por ${canceladoPorTxt}.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${rows
        .map(
          ([label, value]) => `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 0;color:#888;width:110px;vertical-align:top">${label}</td>
        <td style="padding:10px 0;color:#222;font-weight:500">${value}</td>
      </tr>`
        )
        .join("")}
    </table>
    `
  );
  return { subject: "MOVARA — Se canceló una visita", html };
}
