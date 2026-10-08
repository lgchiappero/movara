import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { anularReciboSchema } from "@/lib/validators/recibo";
import { anularRecibo } from "@/lib/recibos/servicio";

/** Anular: solo rol admin y solo si está pendiente. El link deja de
 * funcionar (reciboPorToken ignora los anulados). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  if (!isAdmin(session.rol)) {
    return NextResponse.json({ error: "Solo un administrador puede anular un recibo" }, { status: 403 });
  }
  if (!anularReciboSchema.safeParse(await req.json().catch(() => null)).success) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const res = await anularRecibo(id, session.email);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}
