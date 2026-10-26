import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nuevoPedidoManualSchema } from "@/lib/validators/admin-pedido-manual";
import { generateNumeroConsulta } from "@/lib/pedido/numero-consulta";
import { conSavepoint, registrarContacto } from "@/lib/clientes/servicio";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = nuevoPedidoManualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const config = await db.$transaction(async (tx) => {
      const numeroConsulta = await generateNumeroConsulta(tx);
      const creado = await tx.configuracionPedido.create({
        data: {
          clienteNombre: data.clienteNombre,
          tipoCliente: data.tipoCliente,
          razonSocial: data.razonSocial ?? null,
          clienteEmail: data.clienteEmail || null,
          clienteWhatsapp: data.clienteWhatsapp,
          provincia: data.provincia ?? null,
          modelo: data.modelo ?? null,
          finalidad: data.finalidad ?? null,
          vendedorAsignado: data.vendedorAsignado ?? null,
          notasInternas: data.notasInternas ?? null,
          numeroConsulta,
        },
      });
      // Igual que el configurador: si falla, el pedido se guarda igual.
      await conSavepoint(tx, "vincular_cliente", () =>
        registrarContacto(
          tx,
          {
            nombre: data.clienteNombre,
            email: data.clienteEmail || null,
            telefono: data.clienteWhatsapp,
            tipoCliente: data.tipoCliente,
            razonSocial: data.razonSocial ?? null,
            provincia: data.provincia ?? null,
          },
          { tipo: "pedido", pedidoId: creado.id, numeroConsulta }
        )
      ).catch((err) => console.error(`[admin/configuraciones POST] ${numeroConsulta} No se pudo vincular cliente y lead`, err));
      return creado;
    });

    return NextResponse.json(
      { ok: true, id: config.id, numeroConsulta: config.numeroConsulta },
      { status: 201 }
    );
  } catch (err) {
    console.error("[admin/configuraciones POST]", err);
    return NextResponse.json({ error: "Error al crear el pedido" }, { status: 500 });
  }
}
