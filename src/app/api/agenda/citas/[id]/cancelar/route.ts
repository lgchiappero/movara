import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  buildCancelacionClienteEmail,
  buildCancelacionAdminEmail,
  type CitaEmailData,
} from "@/lib/email/cita-emails";
import { enviarEmail } from "@/lib/email/enviar";

async function enviarEmailsCancelacion(cita: CitaEmailData) {
  const contactEmail = process.env.CONTACT_EMAIL;

  const cliente = buildCancelacionClienteEmail(cita);
  const rCliente = await enviarEmail({ to: cita.email, replyTo: "contacto@movara.com.ar", subject: cliente.subject, html: cliente.html });
  if (!rCliente.ok) console.error(`[agenda/citas/cancelar] cita=${cita.id} Falló el email al cliente: ${rCliente.error}`);

  if (contactEmail) {
    const admin = buildCancelacionAdminEmail(cita);
    const rAdmin = await enviarEmail({ to: contactEmail, replyTo: "lucianogchiappero@gmail.com", subject: admin.subject, html: admin.html });
    if (!rAdmin.ok) console.error(`[agenda/citas/cancelar] cita=${cita.id} Falló el email a MOVARA: ${rAdmin.error}`);
  }
}

const CancelarSchema = z.object({ email: z.string().trim().email().max(200) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parsed = CancelarSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingresá el email con el que agendaste la visita" }, { status: 400 });
  }

  // Mismo 403 para "no existe" y "el email no coincide": no revela qué ids
  // existen. El email se compara sin distinguir mayúsculas.
  const cita = await db.cita.findUnique({ where: { id } });
  if (!cita || cita.email.trim().toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: "El email no coincide con el de la visita" }, { status: 403 });
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
