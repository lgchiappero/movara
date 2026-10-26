import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { estadoPedidoOptions, ESTADO_PEDIDO_CANCELADO } from "@/lib/pedido/estado-pedido";
import { recalcularEstadoCliente } from "@/lib/clientes/servicio";

const CancelarSchema = z.object({
  motivo: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .nullish()
    .transform((v) => v || null),
});

// Cancelar un pedido: deja de contar para el estado del cliente y no se
// muestra en /mi-pedido. Se guarda el estado que tenía para reactivarlo.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const parsed = CancelarSchema.safeParse((await req.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });
  }

  try {
    const resultado = await db.$transaction(async (tx) => {
      const pedido = await tx.configuracionPedido.findUnique({ where: { id }, select: { estadoPedido: true } });
      if (!pedido) return { status: 404, error: "Pedido no encontrado" } as const;
      if (pedido.estadoPedido === ESTADO_PEDIDO_CANCELADO) return { status: 409, error: "El pedido ya está cancelado" } as const;

      const cancelado = await tx.configuracionPedido.update({
        where: { id },
        data: {
          estadoPedido: ESTADO_PEDIDO_CANCELADO,
          estadoAntesDeCancelar: pedido.estadoPedido,
          motivoCancelacion: parsed.data.motivo,
          fechaCancelacion: new Date(),
          canceladoPor: session.email,
        },
        select: { clienteId: true },
      });
      if (cancelado.clienteId) await recalcularEstadoCliente(tx, cancelado.clienteId);
      return { status: 200 } as const;
    });
    if (resultado.status !== 200) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/configuraciones/:id/cancelar POST]", err);
    return NextResponse.json({ error: "Error al cancelar el pedido" }, { status: 500 });
  }
}

// Reactivar: vuelve al estado que tenía al cancelarse (o a "consulta").
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  try {
    const resultado = await db.$transaction(async (tx) => {
      const pedido = await tx.configuracionPedido.findUnique({
        where: { id },
        select: { estadoPedido: true, estadoAntesDeCancelar: true },
      });
      if (!pedido) return { status: 404, error: "Pedido no encontrado" } as const;
      if (pedido.estadoPedido !== ESTADO_PEDIDO_CANCELADO) return { status: 409, error: "El pedido no está cancelado" } as const;

      const anterior = (estadoPedidoOptions as readonly string[]).includes(pedido.estadoAntesDeCancelar ?? "")
        ? pedido.estadoAntesDeCancelar!
        : "consulta";
      const reactivado = await tx.configuracionPedido.update({
        where: { id },
        data: {
          estadoPedido: anterior,
          estadoAntesDeCancelar: null,
          motivoCancelacion: null,
          fechaCancelacion: null,
          canceladoPor: null,
        },
        select: { clienteId: true },
      });
      if (reactivado.clienteId) await recalcularEstadoCliente(tx, reactivado.clienteId);
      return { status: 200, estadoPedido: anterior } as const;
    });
    if (resultado.status !== 200) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true, estadoPedido: resultado.estadoPedido });
  } catch (err) {
    console.error("[admin/configuraciones/:id/cancelar DELETE]", err);
    return NextResponse.json({ error: "Error al reactivar el pedido" }, { status: 500 });
  }
}
