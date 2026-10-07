import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { modeloLabelsEs } from "@/lib/pdf/pedido-labels-es";
import type { PedidoInput } from "@/lib/validators/pedido";

// Solo el token secreto del link de seguimiento da acceso: los números de
// consulta/pedido son correlativos y se podían recorrer para ver pedidos
// ajenos.
const Schema = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{64}$/),
});

// Mismo mensaje para token mal formado o inexistente: no revela cuáles existen.
const LINK_INVALIDO = "El link de seguimiento no es válido. Pedinos uno nuevo por WhatsApp.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: LINK_INVALIDO }, { status: 404 });
  }

  const config = await db.configuracionPedido.findUnique({
    where: { tokenSeguimiento: parsed.data.token },
    select: {
      numeroConsulta: true,
      numeroPedido: true,
      clienteNombre: true,
      modelo: true,
      notasCliente: true,
      estadoPedido: true,
      fechaConfirmacion: true,
      fechaProduccion: true,
      fechaDespacho: true,
      fechaArriboEstimado: true,
      fechaEntrega: true,
    },
  });

  if (!config) {
    return NextResponse.json({ error: LINK_INVALIDO }, { status: 404 });
  }

  return NextResponse.json({
    numeroConsulta: config.numeroConsulta,
    numeroPedido: config.numeroPedido,
    clienteNombre: config.clienteNombre,
    modelo: config.modelo ? modeloLabelsEs[config.modelo as PedidoInput["modelo"]] : null,
    notasCliente: config.notasCliente,
    estadoPedido: config.estadoPedido,
    fechaConfirmacion: config.fechaConfirmacion,
    fechaProduccion: config.fechaProduccion,
    fechaDespacho: config.fechaDespacho,
    fechaArriboEstimado: config.fechaArriboEstimado,
    fechaEntrega: config.fechaEntrega,
  });
}
