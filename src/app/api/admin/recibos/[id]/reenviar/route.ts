import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { enviarSolicitud } from "@/lib/recibos/servicio";
import { baseUrlLinks } from "@/lib/recibos/http";

/** Reenvía al cliente el email con el link — solo mientras está pendiente. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const recibo = await db.reciboConformidad.findUnique({ where: { id } });
  if (!recibo) return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
  if (recibo.estado !== "pendiente") {
    return NextResponse.json({ error: "Solo se reenvía el email de un recibo pendiente" }, { status: 409 });
  }

  const email = await enviarSolicitud(recibo, baseUrlLinks(req));
  if (!email.ok) {
    return NextResponse.json({ error: `No se pudo enviar el email: ${email.error}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
