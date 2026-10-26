import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buscarOCrearCliente, recalcularEstadoCliente } from "@/lib/clientes/servicio";
import { clavesContacto } from "@/lib/clientes/normalizar";

// "Convertir a cliente" — solo disponible una vez que el lead está en
// etapa "ganado" (se re-valida acá server-side, no solo en el botón del
// panel lateral). Si el lead ya tiene cliente (lo creó el configurador o un
// formulario) no se duplica: se responde con ese cliente. Si no, se busca
// uno con el mismo email o teléfono antes de crear uno nuevo. Después se
// vinculan al lead y al cliente los pedidos del mismo email sin lead.
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
    return NextResponse.json({ ok: true, clienteId: lead.clienteId, yaVinculado: true });
  }

  try {
    const cliente = await db.$transaction(async (tx) => {
      const c = await buscarOCrearCliente(tx, {
        nombre: lead.nombre,
        apellido: lead.apellido,
        dni: lead.dni,
        email: lead.email,
        telefono: lead.telefono,
        provincia: lead.provincia,
      });

      await tx.lead.update({
        where: { id },
        data: { clienteId: c.id, ...clavesContacto(lead.email, lead.telefono) },
      });

      if (lead.email) {
        await tx.configuracionPedido.updateMany({
          where: { clienteEmail: lead.email, leadId: null },
          data: { leadId: id },
        });
        await tx.configuracionPedido.updateMany({
          where: { clienteEmail: lead.email, clienteId: null },
          data: { clienteId: c.id },
        });
      }
      await recalcularEstadoCliente(tx, c.id);
      return c;
    });

    return NextResponse.json(
      { ok: true, clienteId: cliente.id, yaVinculado: !cliente.nuevo },
      { status: cliente.nuevo ? 201 : 200 }
    );
  } catch (err) {
    console.error("[admin/leads/:id/convertir POST]", err);
    return NextResponse.json({ error: "Error al convertir el lead" }, { status: 500 });
  }
}
