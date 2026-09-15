import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editarUsuarioSchema } from "@/lib/validators/admin-usuarios";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = editarUsuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const target = await db.adminUser.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const eraAdminActivo = target.rol === "admin" && target.activo;
  const rolResultante = parsed.data.rol ?? target.rol;
  const activoResultante = parsed.data.activo ?? target.activo;
  const seguiraAdminActivo = rolResultante === "admin" && activoResultante;

  if (eraAdminActivo && !seguiraAdminActivo) {
    const otrosAdminsActivos = await db.adminUser.count({
      where: { rol: "admin", activo: true, id: { not: id } },
    });
    if (otrosAdminsActivos === 0) {
      return NextResponse.json(
        { error: "No podés desactivar ni cambiarle el rol al último admin" },
        { status: 409 }
      );
    }
  }

  const usuario = await db.adminUser.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({
    ok: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      ultimoLogin: usuario.ultimoLogin,
    },
  });
}
