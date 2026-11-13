import type { Prisma } from "@prisma/client";
import { esClaveFechaValida, finDiaAR, instanteAR } from "@/lib/fecha-ar";

export type FiltrosLeads = { desde?: string; hasta?: string; provincia?: string; sinResponder?: string };

/** "YYYY-MM-DD" válido → inicio (00:00) o fin (23:59:59.999) de ese día en
 * Argentina; cualquier otra cosa → null (una fecha mal formada en la URL se
 * ignora en vez de romper la query). */
function fechaValida(valor: string | undefined, extremo: "inicio" | "fin"): Date | null {
  if (!valor || !esClaveFechaValida(valor)) return null;
  return extremo === "inicio" ? instanteAR(valor) : finDiaAR(instanteAR(valor, 12));
}

/** Filtro de /admin/leads — lo usan la página y la exportación CSV, así el
 * CSV trae exactamente lo que se ve en pantalla. "Sin responder" = sin
 * marcar como contactado y con más de 48hs desde que llegó (mismo criterio
 * que la alerta del dashboard); se combina con "Hasta" quedándose con la
 * fecha más temprana de las dos. */
export function buildLeadsWhere(f: FiltrosLeads, ahora: Date = new Date()): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  const desde = fechaValida(f.desde, "inicio");
  let hasta = fechaValida(f.hasta, "fin");

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
