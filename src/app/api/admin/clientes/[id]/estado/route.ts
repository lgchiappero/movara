import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { cambioEstadoClienteSchema } from "@/lib/clientes/estado";
import { recalcularEstadoCliente } from "@/lib/clientes/servicio";

// Estado del cliente a mano ({ estado }) o de vuelta al cálculo automático
// ({ automatico: true }). El manual queda marcado con fecha y usuario hasta
// que un pedido lleve al cliente más adelante (ver resolverEstado).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const parsed = cambioEstadoClienteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });
  }

  try {
    const cliente = await db.$transaction(async (tx) => {
      const existe = await tx.cliente.findUnique({ where: { id }, select: { estadoAutomatico: true } });
      if (!existe) return null;
      if ("estado" in parsed.data) {
        await tx.cliente.update({
          where: { id },
          data: { estado: parsed.data.estado, estadoManual: true, estadoManualEn: new Date(), estadoManualPor: session.email },
        });
      } else {
        // Se apaga el manual, vuelve el último automático y se recalcula por
        // si cambió algo desde entonces.
        await tx.cliente.update({
          where: { id },
          data: { estadoManual: false, estadoManualEn: null, estadoManualPor: null, estado: existe.estadoAutomatico },
        });
        await recalcularEstadoCliente(tx, id);
      }
      return tx.cliente.findUniqueOrThrow({
        where: { id },
        select: { estado: true, estadoManual: true, estadoManualEn: true, estadoManualPor: true },
      });
    });
    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, cliente });
  } catch (err) {
    console.error("[admin/clientes/:id/estado PATCH]", err);
    return NextResponse.json({ error: "Error al guardar el estado" }, { status: 500 });
  }
}
