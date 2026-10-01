import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadContactadoSchema } from "@/lib/validators/lead";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = leadContactadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const lead = await db.lead.update({
      where: { id },
      data: {
        contactado: parsed.data.contactado,
        contactadoEn: parsed.data.contactado ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    console.error("[admin/leads/:id PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}

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

  const cantidadPedidos = await db.configuracionPedido.count({ where: { leadId: id } });
  if (cantidadPedidos > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${cantidadPedidos} consulta${cantidadPedidos === 1 ? "" : "s"} asociada${cantidadPedidos === 1 ? "" : "s"}` },
      { status: 400 }
    );
  }

  try {
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/leads/:id DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
