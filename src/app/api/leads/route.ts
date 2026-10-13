import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enviarEmail } from "@/lib/email/enviar";
import { getClientIP } from "@/lib/rate-limit";
import { claveIP, consumirRateLimit } from "@/lib/rate-limit-db";
import { escapeHtml } from "@/lib/email/escape-html";
import { resumenError } from "@/lib/log-seguro";
import { MENSAJE_LEAD_NO_GUARDADO } from "@/lib/leads/enviar-lead";

// Formulario público que dispara emails (incluido uno a la dirección que se
// ingresa): tope estricto por IP para que no sirva de relay de spam.
const LEADS_MAX_POR_HORA = 3;
const UNA_HORA_MS = 60 * 60_000;

const LeadSchema = z.object({
  nombre: z.string().min(2).max(100),
  apellido: z.string().min(2).max(100).optional(),
  dni: z.string().regex(/^\d{7,8}$/).optional().or(z.literal("")),
  telefono: z.string().min(6).max(30),
  email: z.string().email().optional().or(z.literal("")),
  provincia: z.string().max(60).optional(),
  mensaje: z.string().max(2000).optional(),
  // Qué formulario lo envió — solo para el log, no se guarda.
  formulario: z.enum(["contacto", "dossier", "dossier-llamada"]).optional(),
});

type LeadData = {
  nombre: string;
  apellido?: string | null;
  dni?: string | null;
  telefono: string;
  email?: string | null;
  provincia?: string | null;
  mensaje?: string | null;
};

function buildAdminHtml(lead: LeadData, receivedAt: string) {
  const nombreCompleto = [lead.nombre, lead.apellido].filter(Boolean).join(" ");
  const rows = [
    ["Nombre completo", nombreCompleto],
    ["DNI", lead.dni || "—"],
    ["Email", lead.email || "—"],
    ["Teléfono", lead.telefono],
    ["Provincia", lead.provincia || "—"],
    ["Consulta", lead.mensaje || "—"],
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
      <p style="margin:0;color:#D4B06A;font-size:18px;font-weight:bold;">🏠 Nuevo lead MOVARA</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows.map(([label, value]) => `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;color:#888;width:150px;vertical-align:top">${label}</td>
          <td style="padding:10px 0;color:#222;font-weight:500;white-space:pre-wrap">${escapeHtml(value)}</td>
        </tr>`).join("")}
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#bbb;">Recibido el ${receivedAt}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildClientHtml(lead: LeadData) {
  const nombre = lead.nombre;
  const rows = [
    ["Nombre", [lead.nombre, lead.apellido].filter(Boolean).join(" ")],
    ["Email", lead.email || "—"],
    ["Teléfono", lead.telefono],
    ["Provincia", lead.provincia || "—"],
  ].filter(([, v]) => v !== "—");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
      <p style="margin:0;color:#D4B06A;font-size:18px;font-weight:bold;">MOVARA — Espacios Modulares</p>
    </div>
    <div style="padding:24px;">
      <p style="font-size:16px;color:#222;">Hola ${escapeHtml(nombre)},</p>
      <p style="color:#555;line-height:1.6;">Recibimos tu consulta y un asesor MOVARA te va a contactar a la brevedad con toda la información que necesitás.</p>
      <p style="color:#555;line-height:1.6;font-weight:600;margin-top:20px;">Resumen de lo que nos enviaste:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
        ${rows.map(([label, value]) => `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:8px 0;color:#888;width:120px">${label}</td>
          <td style="padding:8px 0;color:#222">${escapeHtml(value)}</td>
        </tr>`).join("")}
      </table>
      ${lead.mensaje ? `<div style="margin-top:16px;padding:12px;background:#f9f5ee;border-left:4px solid #D4B06A;border-radius:4px;font-size:13px;color:#555;white-space:pre-wrap">${escapeHtml(lead.mensaje)}</div>` : ""}
      <p style="color:#888;font-size:13px;margin-top:24px;">Ante cualquier duda podés responder este email.</p>
      <p style="color:#888;font-size:13px;">— El equipo MOVARA</p>
    </div>
  </div>
</body>
</html>`;
}

/** Aviso a MOVARA y confirmación al cliente. Devuelve si salió el aviso a
 * MOVARA. Los logs llevan el id del lead y el tipo de error, nunca datos
 * personales. */
async function sendEmails(lead: LeadData, leadId: string): Promise<boolean> {
  const contactEmail = process.env.CONTACT_EMAIL;
  const nombreCompleto = [lead.nombre, lead.apellido].filter(Boolean).join(" ");
  const now = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "full",
    timeStyle: "short",
  });

  let sent = false;

  if (contactEmail) {
    const r = await enviarEmail({
      to: contactEmail,
      replyTo: "lucianogchiappero@gmail.com",
      subject: `MOVARA | Consulta — ${nombreCompleto} | ${lead.telefono}`,
      html: buildAdminHtml(lead, now),
    });
    if (r.ok) sent = true;
    else console.error(`[leads] id=${leadId} Falló el email a MOVARA: ${r.error}`);
  }

  if (lead.email) {
    const r = await enviarEmail({
      to: lead.email,
      replyTo: "contacto@movara.com.ar",
      subject: "Recibimos tu consulta — MOVARA",
      html: buildClientHtml(lead),
    });
    if (!r.ok) console.error(`[leads] id=${leadId} Falló el email de confirmación: ${r.error}`);
  }

  return sent;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Solo cuentan los envíos válidos: un error de tipeo no consume cupo.
    // Si la tabla del rate limit no responde se deja pasar (con log); si
    // tampoco se puede guardar el lead, más abajo se responde 503.
    const permitido = await consumirRateLimit(claveIP("leads", getClientIP(req)), LEADS_MAX_POR_HORA, UNA_HORA_MS)
      .catch((err) => {
        console.error(`[leads] Rate limit no disponible — se permite el envío: ${resumenError(err)}`);
        return true;
      });
    if (!permitido) {
      return NextResponse.json(
        { error: "Recibimos varias consultas desde tu conexión. Probá en una hora o escribinos por WhatsApp." },
        { status: 429 }
      );
    }

    const data: LeadData = {
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido || null,
      dni: parsed.data.dni || null,
      telefono: parsed.data.telefono,
      email: parsed.data.email || null,
      provincia: parsed.data.provincia || null,
      mensaje: parsed.data.mensaje || null,
    };

    // Los logs registran solo id, origen y resultado — nunca nombre, DNI,
    // email ni teléfono.
    const origen = parsed.data.formulario ?? "web";
    let leadId: string;
    try {
      leadId = (await db.lead.create({ data })).id;
    } catch (dbError) {
      // Sin registro en la base no se confirma nada al usuario (ni 201 ni
      // email de "recibimos tu consulta"): el formulario le ofrece WhatsApp
      // para que la consulta no se pierda.
      console.error(`[leads] origen=${origen} db=error No se pudo guardar el lead: ${resumenError(dbError)}`);
      return NextResponse.json({ error: MENSAJE_LEAD_NO_GUARDADO, code: "lead-no-guardado" }, { status: 503 });
    }

    const emailSent = await sendEmails(data, leadId);
    console.log(`[leads] id=${leadId} origen=${origen} db=ok email=${emailSent ? "ok" : "no-enviado"}`);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error(`[leads] ${resumenError(error)}`);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
