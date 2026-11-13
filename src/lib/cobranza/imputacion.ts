import type { EstadoCuota } from "@/lib/cobranza/constantes";
import { esVencida } from "@/lib/fecha-ar";

// Imputación de los pagos (movimientos) de un plan a sus cuotas: de acá sale
// el estado real de cada cuota. Una cuota está pagada cuando lo imputado
// cubre su importe.
//
// 1. Cada movimiento con cuotaId salda primero esa cuota (hasta su importe).
// 2. Los movimientos "sin cuota específica" y lo que sobre de un pago
//    imputado de más se aplican a las cuotas con saldo, de la que vence
//    antes a la que vence después (sin vencimiento, al final).
//
// El mismo criterio está replicado en sql/20261110_cuotas_*.sql: si se
// cambia acá, cambiarlo también allá.

const EPSILON = 0.01;

export type CuotaParaImputar = {
  id: string;
  importe: number;
  vencimiento: Date | string | null;
  createdAt?: Date | string | null;
};

export type MovimientoParaImputar = { cuotaId: string | null; importe: number };

export type CuotaImputada = {
  id: string;
  importe: number;
  /** Lo imputado a la cuota (nunca más que su importe). */
  pagado: number;
  /** Lo que falta pagar (0 si está pagada). */
  restante: number;
  estado: EstadoCuota;
  /** Vencida y con saldo. */
  vencida: boolean;
};

function tiempo(v: Date | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Orden de aplicación del saldo libre: vencimiento ascendente (sin
 * vencimiento al final), después por fecha de alta y por id. */
function compararCuotas(a: CuotaParaImputar, b: CuotaParaImputar): number {
  const va = tiempo(a.vencimiento);
  const vb = tiempo(b.vencimiento);
  if (va !== vb) {
    if (va === null) return 1;
    if (vb === null) return -1;
    return va - vb;
  }
  const ca = tiempo(a.createdAt) ?? 0;
  const cb = tiempo(b.createdAt) ?? 0;
  if (ca !== cb) return ca - cb;
  return a.id < b.id ? -1 : 1; // los ids son únicos
}

/** Estado real de cada cuota de un plan, en el orden en que vinieron. */
export function imputarCuotas(
  cuotas: CuotaParaImputar[],
  movimientos: MovimientoParaImputar[],
  ahora: Date
): CuotaImputada[] {
  const ids = new Set(cuotas.map((c) => c.id));
  const asignado = new Map<string, number>();
  let libre = 0;
  for (const m of movimientos) {
    if (m.cuotaId && ids.has(m.cuotaId)) asignado.set(m.cuotaId, (asignado.get(m.cuotaId) ?? 0) + m.importe);
    else libre += m.importe;
  }

  const pagado = new Map<string, number>();
  for (const c of cuotas) {
    const directo = asignado.get(c.id) ?? 0;
    const aplicado = Math.min(directo, c.importe);
    pagado.set(c.id, aplicado);
    libre += directo - aplicado;
  }

  for (const c of [...cuotas].sort(compararCuotas)) {
    if (libre <= EPSILON) break;
    const falta = c.importe - pagado.get(c.id)!;
    if (falta <= EPSILON) continue;
    const aplicado = Math.min(falta, libre);
    pagado.set(c.id, pagado.get(c.id)! + aplicado);
    libre -= aplicado;
  }

  return cuotas.map((c) => {
    const p = pagado.get(c.id)!;
    const restante = c.importe - p <= EPSILON ? 0 : c.importe - p;
    // Vencida desde el día siguiente a su vencimiento, en hora argentina.
    const vencida = restante > 0 && tiempo(c.vencimiento) !== null && esVencida(c.vencimiento, ahora);
    const estado: EstadoCuota = restante === 0 ? "pagado" : vencida ? "vencido" : "pendiente";
    return { id: c.id, importe: c.importe, pagado: p, restante, estado, vencida };
  });
}
