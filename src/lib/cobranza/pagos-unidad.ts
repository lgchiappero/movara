import { sumaImportes } from "@/lib/cobranza/calc";
import { planPagoVencido } from "@/lib/indicadores/pagos";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

// Tolerancia para comparar importes — misma que calc.ts.
const EPSILON = 0.01;

/** Estado de un pago a proveedor (plan de una unidad). */
export type EstadoPagoUnidad = "pendiente" | "parcial" | "pagado" | "vencido";

export const ESTADO_PAGO_UNIDAD_LABELS: Record<EstadoPagoUnidad, string> = {
  pendiente: "Pendiente",
  parcial: "En curso",
  pagado: "Saldado",
  vencido: "Vencido",
};

export const ESTADO_PAGO_UNIDAD_COLORS: Record<EstadoPagoUnidad, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  parcial: "bg-blue-100 text-blue-700",
  pagado: "bg-emerald-100 text-emerald-700",
  vencido: "bg-red-100 text-red-700",
};

/** Estado de un plan de pago a proveedor. "vencido" = alguna cuota vencida
 * con saldo real (indicadores/pagos.ts): el mismo criterio que la tarjeta
 * "Pagos vencidos" y la alerta del dashboard. */
export function estadoPagoUnidad(plan: AcuerdoConDetalle, ahora: Date): EstadoPagoUnidad {
  const pagado = sumaImportes(plan.movimientos);
  if (pagado >= plan.totalAcordado - EPSILON) return "pagado";
  if (planPagoVencido(plan, ahora)) return "vencido";
  return pagado > EPSILON ? "parcial" : "pendiente";
}

/** A qué bloque de costos pertenece un pago por unidad — para la
 * rentabilidad: fábrica, logística nacional, o internacional (pagos viejos
 * por unidad de flete/aduana/etc., antes de que se cargaran por envío). */
export type CategoriaCosto = "fabrica" | "nacional" | "internacional";

const INTERNACIONAL = new Set(["flete", "seguro", "aduana", "despachante", "impuestos"]);

export function categoriaCosto(concepto: string): CategoriaCosto {
  if (concepto === "fabrica") return "fabrica";
  return INTERNACIONAL.has(concepto) ? "internacional" : "nacional";
}
