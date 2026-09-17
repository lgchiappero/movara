import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { citaAdminActionSchema } from "@/lib/validators/admin-agenda";
import {
  buildCancelacionClienteEmail,
  buildCancelacionAdminEmail,
  type CitaEmailData,
} from "@/lib/email/cita-emails";

async function enviarEmailsCancelacion(cita: CitaEmailData) {
  const apiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "MOVARA <onboarding@resend.dev>";
  if (!apiKey) return;

  const resend = new Resend(apiKey);

  try {
    const { subject, html } = buildCancelacionClienteEmail(cita);
    await resend.emails.send({ from: fromEmail, to: cita.email, subject, html });
  } catch (err) {
    console.error("[admin/agenda/citas] Error avisando cancelación al cliente:", err);
  }

  if (contactEmail) {
    try {
      const { subject, html } = buildCancelacionAdminEmail(cita);
      await resend.emails.send({ from: fromEmail, to: contactEmail, subject, html });
    } catch (err) {
      console.error("[admin/agenda/citas] Error avisando cancelación al admin:", err);
    }
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = citaAdminActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const cita = await db.cita.findUnique({ where: { id } });
  if (!cita) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  if (parsed.data.accion === "cancelar") {
    const actualizada = await db.cita.update({
      where: { id },
      data: {
        estado: "cancelada",
        canceladaPor: "admin",
        motivoCancelacion: parsed.data.motivo?.trim() || null,
      },
    });
    await enviarEmailsCancelacion({
      id: actualizada.id,
      fecha: actualizada.fecha,
      horario: actualizada.horario,
      nombre: actualizada.nombre,
      email: actualizada.email,
      telefono: actualizada.telefono,
      tipoCliente: actualizada.tipoCliente,
      razonSocial: actualizada.razonSocial,
      consulta: actualizada.consulta,
      canceladaPor: actualizada.canceladaPor,
      motivoCancelacion: actualizada.motivoCancelacion,
    });
    return NextResponse.json({ ok: true, cita: actualizada });
  }

  const actualizada = await db.cita.update({ where: { id }, data: { estado: "completada" } });
  return NextResponse.json({ ok: true, cita: actualizada });
}
