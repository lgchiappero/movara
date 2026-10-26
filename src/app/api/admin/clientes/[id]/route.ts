import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validators/cliente";
import { clavesContacto } from "@/lib/clientes/normalizar";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const cliente = await db.cliente.update({
      where: { id },
      data: { ...parsed.data, ...clavesContacto(parsed.data.email, parsed.data.telefono) },
    });
    return NextResponse.json({ ok: true, cliente });
  } catch (err) {
    console.error("[admin/clientes/:id PATCH]", err);
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

  const cantidadUnidades = await db.unidad.count({ where: { clienteId: id } });
  if (cantidadUnidades > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${cantidadUnidades} unidad${cantidadUnidades === 1 ? "" : "es"} asociada${cantidadUnidades === 1 ? "" : "s"}` },
      { status: 400 }
    );
  }

  try {
    // lead.clienteId no tiene FK: se desvincula a mano. Los pedidos quedan
    // sin cliente por la FK (ON DELETE SET NULL).
    await db.$transaction([
      db.lead.updateMany({ where: { clienteId: id }, data: { clienteId: null } }),
      db.cliente.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/clientes/:id DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
