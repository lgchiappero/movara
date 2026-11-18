import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exigirSesion } from "@/lib/bot-whatsapp/permisos";
import { codigoPrisma, leerYValidar } from "@/lib/bot-whatsapp/http";
import { excluidoCreateSchema } from "@/lib/validators/bot-whatsapp";

/** Contactos a los que el bot nunca responde. Ver y agregar: los dos roles. */
export async function GET() {
  const acceso = await exigirSesion();
  if (!acceso.ok) return acceso.respuesta;
  const excluidos = await db.contactoExcluido.findMany({ orderBy: { creadoEn: "desc" } });
  return NextResponse.json({ excluidos });
}

export async function POST(req: Request) {
  const acceso = await exigirSesion({ escritura: true });
  if (!acceso.ok) return acceso.respuesta;
  const lectura = await leerYValidar(req, excluidoCreateSchema);
  if (!lectura.ok) return lectura.respuesta;
  try {
    const excluido = await db.contactoExcluido.create({ data: { ...lectura.datos, creadoPor: acceso.sesion.email } });
    return NextResponse.json({ excluido }, { status: 201 });
  } catch (err) {
    if (codigoPrisma(err) === "P2002") return NextResponse.json({ error: "Ese teléfono ya está excluido" }, { status: 409 });
    throw err;
  }
}
