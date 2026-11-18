import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exigirSesion } from "@/lib/bot-whatsapp/permisos";
import { codigoPrisma } from "@/lib/bot-whatsapp/http";

/** Sacar a alguien de la lista de excluidos: solo administrador. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acceso = await exigirSesion({ soloAdmin: true, escritura: true });
  if (!acceso.ok) return acceso.respuesta;
  const { id } = await params;
  try {
    await db.contactoExcluido.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (codigoPrisma(err) === "P2025") return NextResponse.json({ error: "Ese contacto no existe" }, { status: 404 });
    throw err;
  }
}
