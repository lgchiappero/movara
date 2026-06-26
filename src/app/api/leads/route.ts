import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";

const LeadSchema = z.object({
  nombre: z.string().min(2).max(100),
  apellido: z.string().min(2).max(100).optional(),
  dni: z.string().regex(/^\d{7,8}$/).optional().or(z.literal("")),
  telefono: z.string().min(6).max(30),
  email: z.string().email().optional().or(z.literal("")),
  provincia: z.string().max(60).optional(),
  mensaje: z.string().max(1000).optional(),
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

async function sendNotificationEmail(lead: LeadData) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_EMAIL } = process.env;
  if (!SMTP_HOST || !CONTACT_EMAIL) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const nombreCompleto = [lead.nombre, lead.apellido].filter(Boolean).join(" ");

  await transporter.sendMail({
    from: `"MOVARA Leads" <${SMTP_USER}>`,
    to: CONTACT_EMAIL,
    subject: `Nuevo lead MOVARA — ${nombreCompleto}`,
    text: [
      `Nombre:    ${nombreCompleto}`,
      `DNI:       ${lead.dni || "—"}`,
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

    const data: LeadData = {
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido || null,
      dni: parsed.data.dni || null,
      telefono: parsed.data.telefono,
      email: parsed.data.email || null,
      provincia: parsed.data.provincia || null,
      mensaje: parsed.data.mensaje || null,
    };

    let savedId: string | undefined;
    try {
      const lead = await db.lead.create({ data });
      savedId = lead.id;
      await sendNotificationEmail(lead).catch(() => {});
    } catch (dbError) {
      console.error("[leads] DB unavailable — lead NOT saved:", dbError);
      await sendNotificationEmail(data).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: savedId }, { status: 201 });
  } catch (error) {
    console.error("[leads]", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
