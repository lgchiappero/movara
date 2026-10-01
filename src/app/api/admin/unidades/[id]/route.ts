import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { unidadEditSchema } from "@/lib/validators/unidad";
import { calcularGarantiaFechaFin } from "@/lib/pedido/garantia";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";

// Datos mínimos de una unidad para autocompletar formularios (ej: modal
// "Nuevo cobro" → cliente y precio acordado).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const unidad = await db.unidad.findUnique({
      where: { id },
      select: {
        id: true,
        numeroUnidad: true,
        precioCliente: true,
        cliente: { select: { id: true, nombre: true } },
      },
    });
    if (!unidad) {
      return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, unidad });
  } catch (err) {
    console.error("[admin/unidades/:id GET]", err);
    return NextResponse.json({ error: "Error al obtener la unidad" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = unidadEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const garantiaFin = calcularGarantiaFechaFin(data.garantiaInicio);

  try {
    const unidad = await db.unidad.update({
      where: { id },
      data: {
        ...data,
        // Json? nullable requiere Prisma.JsonNull explícito para "poner en
        // NULL" — un `null` de JS a secas ahí es ambiguo para Prisma.
        configuracion:
          data.configuracion === null ? Prisma.JsonNull : (data.configuracion as Prisma.InputJsonValue),
        garantiaFin,
      },
    });
    return NextResponse.json({ ok: true, unidad });
  } catch (err) {
    console.error("[admin/unidades/:id PATCH]", err);
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

  const [cantidadPagos, cantidadDocumentos] = await Promise.all([
    db.acuerdoPago.count({ where: { unidadId: id } }),
    db.documentoUnidad.count({ where: { unidadId: id } }),
  ]);

  if (cantidadPagos > 0 || cantidadDocumentos > 0) {
    const partes: string[] = [];
    if (cantidadPagos > 0) partes.push(`${cantidadPagos} pago${cantidadPagos === 1 ? "" : "s"}`);
    if (cantidadDocumentos > 0) partes.push(`${cantidadDocumentos} documento${cantidadDocumentos === 1 ? "" : "s"}`);
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${partes.join(" y ")} asociado${partes.length > 1 || cantidadPagos + cantidadDocumentos > 1 ? "s" : ""}` },
      { status: 400 }
    );
  }

  try {
    await db.unidad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/unidades/:id DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
