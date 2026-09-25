import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// "Convertir a cliente" — solo disponible una vez que el lead está en
// etapa "ganado" (se re-valida acá server-side, no solo en el botón del
// panel lateral). Crea el Cliente, guarda lead.clienteId, y vincula las
// ConfiguracionPedido existentes de ese email que todavía no tuvieran
// leadId — ConfiguracionPedido no tiene una FK directa a Cliente, así que
// "vincular" acá significa completar esa relación Lead↔Pedido que ya
// existía en el schema.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  if (lead.etapa !== "ganado") {
    return NextResponse.json(
      { error: "El lead debe estar en etapa 'ganado' para convertirlo a cliente" },
      { status: 400 }
    );
  }
  if (lead.clienteId) {
    return NextResponse.json({ error: "Este lead ya fue convertido a cliente" }, { status: 409 });
  }

  try {
    const cliente = await db.$transaction(async (tx) => {
      const nuevoCliente = await tx.cliente.create({
        data: {
          nombre: [lead.nombre, lead.apellido].filter(Boolean).join(" "),
          dni: lead.dni,
          telefono: lead.telefono,
          email: lead.email,
        },
      });

      await tx.lead.update({ where: { id }, data: { clienteId: nuevoCliente.id } });

      if (lead.email) {
        await tx.configuracionPedido.updateMany({
          where: { clienteEmail: lead.email, leadId: null },
          data: { leadId: id },
        });
      }

      return nuevoCliente;
    });

    return NextResponse.json({ ok: true, clienteId: cliente.id }, { status: 201 });
  } catch (err) {
    console.error("[admin/leads/:id/convertir POST]", err);
    return NextResponse.json({ error: "Error al convertir el lead" }, { status: 500 });
  }
}
