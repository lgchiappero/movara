import type { Prisma } from "@prisma/client";

export type FiltrosLeads = { desde?: string; hasta?: string; provincia?: string; sinResponder?: string };

/** "YYYY-MM-DD" válido → Date a esa hora local; cualquier otra cosa → null
 * (una fecha mal formada en la URL se ignora en vez de romper la query). */
function fechaValida(valor: string | undefined, hora: string): Date | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const d = new Date(`${valor}T${hora}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Filtro de /admin/leads — lo usan la página y la exportación CSV, así el
 * CSV trae exactamente lo que se ve en pantalla. "Sin responder" = sin
 * marcar como contactado y con más de 48hs desde que llegó (mismo criterio
 * que la alerta del dashboard); se combina con "Hasta" quedándose con la
 * fecha más temprana de las dos. */
export function buildLeadsWhere(f: FiltrosLeads, ahora: Date = new Date()): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  const desde = fechaValida(f.desde, "00:00:00");
  let hasta = fechaValida(f.hasta, "23:59:59");

  if (f.sinResponder === "1") {
    where.contactado = false;
    const limite = new Date(ahora.getTime() - 48 * 60 * 60 * 1000);
    hasta = hasta && hasta < limite ? hasta : limite;
  }
  if (desde || hasta) {
    where.createdAt = {
      ...(desde ? { gte: desde } : {}),
      ...(hasta ? { lte: hasta } : {}),
    };
  }
  if (f.provincia) {
    where.provincia = { contains: f.provincia, mode: "insensitive" };
  }
  return where;
}
