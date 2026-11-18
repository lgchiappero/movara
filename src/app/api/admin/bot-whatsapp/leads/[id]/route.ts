import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exigirSesion } from "@/lib/bot-whatsapp/permisos";
import { codigoPrisma, leerYValidar } from "@/lib/bot-whatsapp/http";
import { buscarCoincidencias } from "@/lib/bot-whatsapp/coincidencias";
import { leadPatchSchema } from "@/lib/validators/bot-whatsapp";

type Ctx = { params: Promise<{ id: string }> };
const noExiste = () => NextResponse.json({ error: "El lead no existe" }, { status: 404 });

/** Lead con su conversación y si ya figura en Leads o Pedidos. Los dos roles. */
export async function GET(_req: Request, { params }: Ctx) {
  const acceso = await exigirSesion();
  if (!acceso.ok) return acceso.respuesta;
  const { id } = await params;
  const lead = await db.leadWhatsapp.findUnique({
    where: { id },
    include: { mensajes: { orderBy: { creadoEn: "asc" } } },
  });
  if (!lead) return noExiste();
  return NextResponse.json({ lead, coincidencias: await buscarCoincidencias(lead.telefono) });
}

/** Calificación, estado, notas, próximo contacto y control humano. Los dos roles. */
export async function PATCH(req: Request, { params }: Ctx) {
  const acceso = await exigirSesion({ escritura: true });
  if (!acceso.ok) return acceso.respuesta;
  const lectura = await leerYValidar(req, leadPatchSchema);
  if (!lectura.ok) return lectura.respuesta;
  const { id } = await params;
  try {
    const lead = await db.leadWhatsapp.update({ where: { id }, data: lectura.datos });
    return NextResponse.json({ lead });
  } catch (err) {
    if (codigoPrisma(err) === "P2025") return noExiste();
    throw err;
  }
}

/** Borrar un lead (y su conversación): solo administrador. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const acceso = await exigirSesion({ soloAdmin: true, escritura: true });
  if (!acceso.ok) return acceso.respuesta;
  const { id } = await params;
  try {
    await db.leadWhatsapp.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (codigoPrisma(err) === "P2025") return noExiste();
    throw err;
  }
}
