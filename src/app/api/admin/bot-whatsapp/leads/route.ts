import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exigirSesion } from "@/lib/bot-whatsapp/permisos";
import { codigoPrisma, leerYValidar } from "@/lib/bot-whatsapp/http";
import { listarLeads } from "@/lib/bot-whatsapp/leads";
import { leadCreateSchema, leadsQuerySchema } from "@/lib/validators/bot-whatsapp";

/** Leads del bot: filtro por estado, búsqueda y paginado. Los dos roles. */
export async function GET(req: Request) {
  const acceso = await exigirSesion();
  if (!acceso.ok) return acceso.respuesta;
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = leadsQuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Filtro inválido" }, { status: 400 });
  return NextResponse.json(await listarLeads(parsed.data));
}

/** Lead manual (consultas que entran por otro lado). Los dos roles. */
export async function POST(req: Request) {
  const acceso = await exigirSesion({ escritura: true });
  if (!acceso.ok) return acceso.respuesta;
  const lectura = await leerYValidar(req, leadCreateSchema);
  if (!lectura.ok) return lectura.respuesta;
  try {
    const lead = await db.leadWhatsapp.create({ data: lectura.datos, select: { id: true } });
    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    if (codigoPrisma(err) === "P2002") {
      const existente = await db.leadWhatsapp.findUnique({ where: { telefono: lectura.datos.telefono }, select: { id: true } });
      return NextResponse.json({ error: "Ya hay un lead con ese teléfono", id: existente?.id ?? null }, { status: 409 });
    }
    throw err;
  }
}
