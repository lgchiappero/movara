import { sumaImportes } from "@/lib/cobranza/calc";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

// Tolerancia para comparar importes — misma que calc.ts.
const EPSILON = 0.01;

/** Un pago a proveedor es un registro directo (sin plan de cuotas). Se
 * guarda sobre las mismas tablas que los planes, sin cambios de schema:
 * - AcuerdoPago tipo "pago": proveedor, concepto, descripción, moneda,
 *   importe (totalAcordado), notas
 * - una Cuota: importe y fecha (vencimiento = fecha del pago)
 * - si está pagado, un Movimiento: fecha real, modalidad y comprobante
 * Los acuerdos de pago viejos (con varias cuotas o pagos parciales) se
 * muestran igual, como un solo pago, pero no se editan con este formulario. */
export type EstadoPagoProveedor = "pagado" | "pendiente" | "vencido" | "parcial";

export const ESTADO_PAGO_PROVEEDOR_LABELS: Record<EstadoPagoProveedor, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
  parcial: "Parcial",
};

export const ESTADO_PAGO_PROVEEDOR_COLORS: Record<EstadoPagoProveedor, string> = {
  pagado: "bg-emerald-100 text-emerald-700",
  pendiente: "bg-amber-100 text-amber-700",
  vencido: "bg-red-100 text-red-700",
  parcial: "bg-blue-100 text-blue-700",
};

export type PagoProveedorVista = {
  acuerdo: AcuerdoConDetalle;
  /** Fecha del pago (si se pagó) o fecha prevista (si está pendiente), ISO. */
  fecha: string | null;
  importe: number;
  pagado: number;
  estado: EstadoPagoProveedor;
  modalidad: string | null;
  comprobanteSignedUrl: string | null;
  /** true si es un acuerdo con el formato anterior (varias cuotas/pagos) —
   * no se puede editar con el formulario de pago directo. */
  legado: boolean;
};

export function vistaPagoProveedor(acuerdo: AcuerdoConDetalle, hoy: Date): PagoProveedorVista {
  const pagado = sumaImportes(acuerdo.movimientos);
  const ultimoPago = [...acuerdo.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
  const vencimiento = acuerdo.cuotas[0]?.vencimiento ?? null;

  let estado: EstadoPagoProveedor;
  if (pagado >= acuerdo.totalAcordado - EPSILON) estado = "pagado";
  else if (pagado > EPSILON) estado = "parcial";
  else if (vencimiento && new Date(vencimiento).getTime() < hoy.getTime()) estado = "vencido";
  else estado = "pendiente";

  return {
    acuerdo,
    fecha: ultimoPago?.fecha ?? vencimiento,
    importe: acuerdo.totalAcordado,
    pagado,
    estado,
    modalidad: ultimoPago?.modalidad ?? null,
    comprobanteSignedUrl: acuerdo.movimientos.find((m) => m.comprobanteSignedUrl)?.comprobanteSignedUrl ?? null,
    legado: acuerdo.cuotas.length > 1 || acuerdo.movimientos.length > 1,
  };
}

/** Pagos de más reciente a más viejo; los que no tienen fecha, al final. */
export function ordenarPagosProveedor(pagos: PagoProveedorVista[]): PagoProveedorVista[] {
  return [...pagos].sort((a, b) => {
    if (a.fecha === b.fecha) return b.acuerdo.createdAt.localeCompare(a.acuerdo.createdAt);
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return b.fecha.localeCompare(a.fecha);
  });
}
