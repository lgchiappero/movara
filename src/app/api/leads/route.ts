import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";

const LeadSchema = z.object({
  nombre: z.string().min(2).max(100),
  telefono: z.string().min(6).max(30),
  email: z.string().email().optional().or(z.literal("")),
  provincia: z.string().max(60).optional(),
  mensaje: z.string().max(1000).optional(),
});

async function sendNotificationEmail(lead: {
  nombre: string;
  telefono: string;
  email?: string | null;
  provincia?: string | null;
  mensaje?: string | null;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_EMAIL } = process.env;
  if (!SMTP_HOST || !CONTACT_EMAIL) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"MOVARA Leads" <${SMTP_USER}>`,
    to: CONTACT_EMAIL,
    subject: `Nuevo lead MOVARA — ${lead.nombre}`,
    text: [
      `Nombre:    ${lead.nombre}`,
      `Teléfono:  ${lead.telefono}`,
      `Email:     ${lead.email || "—"}`,
      `Provincia: ${lead.provincia || "—"}`,
      `Mensaje:   ${lead.mensaje || "—"}`,
    ].join("\n"),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const data = {
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono,
      email: parsed.data.email || null,
      provincia: parsed.data.provincia || null,
      mensaje: parsed.data.mensaje || null,
    };

    const lead = await db.lead.create({ data });

    await sendNotificationEmail(lead).catch(() => {
      // email is optional — don't fail the request if SMTP is not configured
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error("[leads]", error);
    return NextResponse.json({ error: "Error al guardar el lead" }, { status: 500 });
  }
}
