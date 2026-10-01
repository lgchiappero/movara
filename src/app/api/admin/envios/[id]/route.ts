import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { envioSchema } from "@/lib/validators/envio";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";

// Campos que se reportaron como "no se guardan" — se loguean antes y
// después del update para poder diagnosticarlo desde los logs de Vercel.
const CAMPOS_IDENTIFICACION = { numeroPI: true, numeroBL: true, numeroContenedor: true } as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  console.info("[admin/envios/:id PATCH] body recibido", { id, body });

  const parsed = envioSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[admin/envios/:id PATCH] body inválido", { id, issues: parsed.error.issues });
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const antes = await db.envio.findUnique({ where: { id }, select: CAMPOS_IDENTIFICACION });
    if (!antes) {
      console.warn("[admin/envios/:id PATCH] envío no encontrado", { id });
      return NextResponse.json({ error: "Envío no encontrado" }, { status: 404 });
    }

    const envio = await db.envio.update({ where: { id }, data: parsed.data });
    console.info("[admin/envios/:id PATCH] guardado", {
      id,
      antes,
      enviado: {
        numeroPI: parsed.data.numeroPI,
        numeroBL: parsed.data.numeroBL,
        numeroContenedor: parsed.data.numeroContenedor,
      },
      despues: {
        numeroPI: envio.numeroPI,
        numeroBL: envio.numeroBL,
        numeroContenedor: envio.numeroContenedor,
      },
    });
    return NextResponse.json({ ok: true, envio });
  } catch (err) {
    console.error("[admin/envios/:id PATCH]", { id }, err);
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

  const cantidadUnidades = await db.unidad.count({ where: { envioId: id } });
  if (cantidadUnidades > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${cantidadUnidades} unidad${cantidadUnidades === 1 ? "" : "es"} asociada${cantidadUnidades === 1 ? "" : "s"}` },
      { status: 400 }
    );
  }

  // FK restrict: los costos de logística internacional del envío se
  // eliminan primero, a propósito (son pagos registrados).
  const cantidadCostos = await db.costoLogistica.count({ where: { envioId: id } });
  if (cantidadCostos > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${cantidadCostos} costo${cantidadCostos === 1 ? "" : "s"} de logística cargado${cantidadCostos === 1 ? "" : "s"}` },
      { status: 400 }
    );
  }

  try {
    await db.envio.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/envios/:id DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
