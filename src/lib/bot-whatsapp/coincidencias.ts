import { db } from "@/lib/db";
import { claveDeTelefonoWhatsapp } from "./telefono";

export type Coincidencias = {
  leads: number;
  pedidos: { id: string; numero: string | null }[];
};

/** ¿El contacto ya figura en Leads (formularios) o en Pedidos? Solo
 * lectura: busca por la clave de teléfono (telefonoNorm) en leads y
 * clientes, y junta los pedidos de unos y otros. No unifica tablas. */
export async function buscarCoincidencias(telefono: string): Promise<Coincidencias> {
  const clave = claveDeTelefonoWhatsapp(telefono);
  if (!clave) return { leads: 0, pedidos: [] };

  const [leads, clientes] = await Promise.all([
    db.lead.findMany({ where: { telefonoNorm: clave }, select: { id: true } }),
    db.cliente.findMany({ where: { telefonoNorm: clave }, select: { id: true } }),
  ]);
  const pedidos =
    leads.length || clientes.length
      ? await db.configuracionPedido.findMany({
          where: {
            OR: [
              ...(leads.length ? [{ leadId: { in: leads.map((l) => l.id) } }] : []),
              ...(clientes.length ? [{ clienteId: { in: clientes.map((c) => c.id) } }] : []),
            ],
          },
          select: { id: true, numeroPedido: true, numeroConsulta: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];
  return {
    leads: leads.length,
    pedidos: pedidos.map((p) => ({ id: p.id, numero: p.numeroPedido ?? p.numeroConsulta })),
  };
}
