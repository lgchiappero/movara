import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Todos los campos de Envio son opcionales — "Nuevo envío" crea un
// registro vacío de una sola vez y el resto se completa desde el
// detalle (mismo criterio que "Nuevo pedido manual").
export async function POST() {
  try {
    const envio = await db.envio.create({ data: {} });
    return NextResponse.json({ ok: true, id: envio.id }, { status: 201 });
  } catch (err) {
    console.error("[admin/envios POST]", err);
    return NextResponse.json({ error: "Error al crear el envío" }, { status: 500 });
  }
}
