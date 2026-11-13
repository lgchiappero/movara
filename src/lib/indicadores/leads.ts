import type { Prisma } from "@prisma/client";
import { inicioDiaAR, inicioMesAR } from "@/lib/fecha-ar";

// Indicadores de leads: cada uno es un `where` de Prisma que usan tanto el
// contador (db.lead.count) como la lista filtrada (/admin/pipeline?indicador=…).
// "Hoy" y "este mes" son los del calendario argentino.

export const HORAS_SIN_ATENDER = 48;
export const ETAPAS_EN_NEGOCIACION = ["en_contacto", "propuesta_enviada"] as const;

export const INDICADORES_LEAD = {
  nuevos_hoy: {
    label: "Leads nuevos hoy",
    where: (ahora: Date): Prisma.LeadWhereInput => ({ createdAt: { gte: inicioDiaAR(ahora) } }),
  },
  en_negociacion: {
    label: "En negociación",
    where: (): Prisma.LeadWhereInput => ({ etapa: { in: [...ETAPAS_EN_NEGOCIACION] } }),
  },
  ganados_mes: {
    label: "Ganados este mes",
    // Lead no guarda cuándo pasó a "ganado": cohorte de leads creados este mes.
    where: (ahora: Date): Prisma.LeadWhereInput => ({ etapa: "ganado", createdAt: { gte: inicioMesAR(ahora) } }),
  },
  del_mes: {
    label: "Leads creados este mes",
    where: (ahora: Date): Prisma.LeadWhereInput => ({ createdAt: { gte: inicioMesAR(ahora) } }),
  },
  sin_atender: {
    label: `Sin respuesta hace más de ${HORAS_SIN_ATENDER} h`,
    where: (ahora: Date): Prisma.LeadWhereInput => ({
      contactado: false,
      createdAt: { lte: new Date(ahora.getTime() - HORAS_SIN_ATENDER * 60 * 60 * 1000) },
    }),
  },
  activos: {
    label: "Leads activos",
    where: (): Prisma.LeadWhereInput => ({ etapa: { notIn: ["ganado", "perdido"] } }),
  },
  en_propuesta: {
    label: "En propuesta",
    where: (): Prisma.LeadWhereInput => ({ etapa: "propuesta_enviada" }),
  },
} as const;

export type IndicadorLead = keyof typeof INDICADORES_LEAD;

export function esIndicadorLead(v: unknown): v is IndicadorLead {
  return typeof v === "string" && Object.hasOwn(INDICADORES_LEAD, v);
}

export function whereIndicadorLead(indicador: IndicadorLead, ahora: Date): Prisma.LeadWhereInput {
  return INDICADORES_LEAD[indicador].where(ahora);
}

export function hrefIndicadorLead(indicador: IndicadorLead): string {
  return `/admin/pipeline?indicador=${indicador}`;
}
