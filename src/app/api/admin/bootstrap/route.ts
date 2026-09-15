import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/admin/password";

// Crea el primer admin una sola vez, protegido por un secreto de header —
// pensado para llamarse contra la app ya desplegada (no requiere conectarse
// directo a la base de producción desde otra máquina). Se auto-deshabilita
// en cuanto existe algún AdminUser.
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "Bootstrap no configurado" }, { status: 503 });
  }

  const suppliedSecret = req.headers.get("x-bootstrap-secret");
  if (suppliedSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const existentes = await db.adminUser.count();
  if (existentes > 0) {
    return NextResponse.json(
      { error: "Ya existe al menos un usuario — bootstrap deshabilitado" },
      { status: 409 }
    );
  }

  const email = process.env.ADMIN_INITIAL_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      { error: "ADMIN_INITIAL_EMAIL/ADMIN_INITIAL_PASSWORD no configurados" },
      { status: 500 }
    );
  }

  const hashed = await hashPassword(password);
  const admin = await db.adminUser.create({
    data: { nombre: "Admin", email, password: hashed, rol: "admin", activo: true },
  });

  return NextResponse.json({ ok: true, email: admin.email }, { status: 201 });
}
