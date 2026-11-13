import type { Prisma } from "@prisma/client";
import { inicioMesSoloFechaAR } from "@/lib/fecha-ar";

// Indicadores de unidades: `where` de Prisma compartido por el contador y la
// lista (/admin/unidades?indicador=…).

export const DIAS_ADUANA_DEMORADA = 15;

export const INDICADORES_UNIDAD = {
  activas: {
    label: "Unidades activas",
    where: (): Prisma.UnidadWhereInput => ({ estadoFabricacion: { not: "entregado" } }),
  },
  en_aduana: {
    label: "En aduana",
    where: (): Prisma.UnidadWhereInput => ({ estadoFabricacion: "en_aduana" }),
  },
  aduana_demorada: {
    label: `En aduana hace más de ${DIAS_ADUANA_DEMORADA} días`,
    // Unidad no guarda cuándo entró a aduana: se mide contra su última
    // actualización.
    where: (ahora: Date): Prisma.UnidadWhereInput => ({
      estadoFabricacion: "en_aduana",
      updatedAt: { lte: new Date(ahora.getTime() - DIAS_ADUANA_DEMORADA * 24 * 60 * 60 * 1000) },
    }),
  },
  entregadas_mes: {
    label: "Entregadas este mes",
    // fechaEntrega es solo fecha (medianoche UTC): se compara con el día 1
    // del mes argentino, también como solo fecha.
    where: (ahora: Date): Prisma.UnidadWhereInput => ({
      estadoFabricacion: "entregado",
      fechaEntrega: { gte: inicioMesSoloFechaAR(ahora), lt: inicioMesSoloFechaAR(ahora, 1) },
    }),
  },
} as const;

export type IndicadorUnidad = keyof typeof INDICADORES_UNIDAD;

export function esIndicadorUnidad(v: unknown): v is IndicadorUnidad {
  return typeof v === "string" && Object.hasOwn(INDICADORES_UNIDAD, v);
}

export function whereIndicadorUnidad(indicador: IndicadorUnidad, ahora: Date): Prisma.UnidadWhereInput {
  return INDICADORES_UNIDAD[indicador].where(ahora);
}

export function hrefIndicadorUnidad(indicador: IndicadorUnidad): string {
  return `/admin/unidades?indicador=${indicador}`;
}
