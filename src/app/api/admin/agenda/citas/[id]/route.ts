import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { citaAdminActionSchema } from "@/lib/validators/admin-agenda";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
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
  if (!rCliente.ok) console.error(`[admin/agenda/citas] cita=${cita.id} Falló el aviso de cancelación al cliente: ${rCliente.error}`);

  if (contactEmail) {
    const admin = buildCancelacionAdminEmail(cita);
    const rAdmin = await enviarEmail({ to: contactEmail, replyTo: "lucianogchiappero@gmail.com", subject: admin.subject, html: admin.html });
    if (!rAdmin.ok) console.error(`[admin/agenda/citas] cita=${cita.id} Falló el aviso de cancelación a MOVARA: ${rAdmin.error}`);
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

const TREINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  if (!isAdmin(session.rol)) {
    return NextResponse.json({ error: "Solo un administrador puede eliminar" }, { status: 403 });
  }

  const cita = await db.cita.findUnique({ where: { id } });
  if (!cita) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const esMuyAntigua = Date.now() - cita.fecha.getTime() > TREINTA_DIAS_MS;
  if (cita.estado !== "cancelada" && !esMuyAntigua) {
    return NextResponse.json(
      { error: "Solo se pueden eliminar visitas canceladas o con más de 30 días de antigüedad" },
      { status: 400 }
    );
  }

  await db.cita.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
