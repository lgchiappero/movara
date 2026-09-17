import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
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

  const cliente = buildCancelacionClienteEmail(cita);
  try {
    await resend.emails.send({ from: fromEmail, to: cita.email, subject: cliente.subject, html: cliente.html });
  } catch (err) {
    console.error("[agenda/citas/cancelar] Error enviando email al cliente:", err);
  }

  if (contactEmail) {
    const admin = buildCancelacionAdminEmail(cita);
    try {
      await resend.emails.send({ from: fromEmail, to: contactEmail, subject: admin.subject, html: admin.html });
    } catch (err) {
      console.error("[agenda/citas/cancelar] Error enviando email al admin:", err);
    }
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cita = await db.cita.findUnique({ where: { id } });
  if (!cita) {
    return NextResponse.json({ error: "No encontramos esa visita" }, { status: 404 });
  }
  if (cita.estado === "cancelada") {
    return NextResponse.json({ ok: true, yaEstabaCancelada: true });
  }
  if (cita.estado === "completada") {
    return NextResponse.json({ error: "Esta visita ya se realizó" }, { status: 409 });
  }

  const actualizada = await db.cita.update({
    where: { id },
    data: { estado: "cancelada", canceladaPor: "cliente" },
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

  return NextResponse.json({ ok: true });
}
