import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/admin/password";
import { nuevoUsuarioSchema, MAX_USUARIOS } from "@/lib/validators/admin-usuarios";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = nuevoUsuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const total = await db.adminUser.count();
  if (total >= MAX_USUARIOS) {
    return NextResponse.json(
      { error: `Ya hay ${MAX_USUARIOS} usuarios — es el máximo permitido` },
      { status: 409 }
    );
  }

  const existente = await db.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (existente) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const hashed = await hashPassword(parsed.data.password);
  const usuario = await db.adminUser.create({
    data: {
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      password: hashed,
      rol: parsed.data.rol,
    },
  });

  return NextResponse.json(
    { ok: true, id: usuario.id, email: usuario.email },
    { status: 201 }
  );
}
