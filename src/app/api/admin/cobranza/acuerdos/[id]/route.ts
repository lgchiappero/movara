import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";

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

  const acuerdo = await db.acuerdoPago.findUnique({
    where: { id },
    select: { id: true, _count: { select: { movimientos: true } } },
  });
  if (!acuerdo) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (acuerdo._count.movimientos > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: tiene ${acuerdo._count.movimientos} pago${acuerdo._count.movimientos === 1 ? "" : "s"} registrado${acuerdo._count.movimientos === 1 ? "" : "s"}`,
      },
      { status: 400 }
    );
  }

  // Las cuotas asociadas caen en cascada (onDelete: Cascade) — ya
  // verificamos arriba que no hay movimientos, así que no queda nada más
  // que preservar.
  await db.acuerdoPago.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
