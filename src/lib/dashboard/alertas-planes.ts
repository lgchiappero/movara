import { imputarCuotas, type CuotaParaImputar, type MovimientoParaImputar } from "@/lib/cobranza/imputacion";

// Alertas del dashboard sobre los planes de cobro (clientes) y de pago
// (proveedores), calculadas sobre el estado real: lo que de verdad falta
// pagar de cada cuota según sus movimientos (imputacion.ts), no el campo
// Cuota.estado. Así una cuota saldada con un pago "sin cuota específica"
// deja de alertar, y un pago parcial reduce el saldo que se muestra.

export type PlanParaAlertas = {
  unidadId: string;
  tipo: string;
  moneda: string;
  cuotas: CuotaParaImputar[];
  movimientos: MovimientoParaImputar[];
};

export type SaldoPorMoneda = Record<string, number>;

export type AlertaVencidas = {
  /** Unidades con al menos una cuota vencida con saldo. */
  unidades: number;
  /** Saldo vencido restante, por moneda. */
  saldo: SaldoPorMoneda;
};

export type AlertasPlanes = {
  cobroVencido: AlertaVencidas;
  pagoVencido: AlertaVencidas;
  /** Cuotas de cobro con saldo que vencen esta semana (sin las ya vencidas). */
  cobroVenceSemana: { cuotas: number; saldo: SaldoPorMoneda };
};

function sumar(saldo: SaldoPorMoneda, moneda: string, importe: number) {
  saldo[moneda] = (saldo[moneda] ?? 0) + importe;
}

export function alertasPlanes(
  planes: PlanParaAlertas[],
  ahora: Date,
  semana: { desde: Date; hasta: Date }
): AlertasPlanes {
  const vencidas = { cobro: new Set<string>(), pago: new Set<string>() };
  const saldoVencido: { cobro: SaldoPorMoneda; pago: SaldoPorMoneda } = { cobro: {}, pago: {} };
  const semanaCobro = { cuotas: 0, saldo: {} as SaldoPorMoneda };
  const desde = semana.desde.getTime();
  const hasta = semana.hasta.getTime();

  for (const plan of planes) {
    if (plan.tipo !== "cobro" && plan.tipo !== "pago") continue;
    const tipo = plan.tipo;
    const imputadas = imputarCuotas(plan.cuotas, plan.movimientos, ahora);
    plan.cuotas.forEach((cuota, i) => {
      const c = imputadas[i];
      if (c.vencida) {
        vencidas[tipo].add(plan.unidadId);
        sumar(saldoVencido[tipo], plan.moneda, c.restante);
        return;
      }
      if (tipo !== "cobro" || c.restante === 0 || cuota.vencimiento === null) return;
      const t = new Date(cuota.vencimiento).getTime();
      if (t >= desde && t < hasta) {
        semanaCobro.cuotas++;
        sumar(semanaCobro.saldo, plan.moneda, c.restante);
      }
    });
  }

  return {
    cobroVencido: { unidades: vencidas.cobro.size, saldo: saldoVencido.cobro },
    pagoVencido: { unidades: vencidas.pago.size, saldo: saldoVencido.pago },
    cobroVenceSemana: semanaCobro,
  };
}

/** "USD 1.234 + ARS 50.000" — USD primero; las monedas en 0 no se muestran. */
export function formatSaldo(saldo: SaldoPorMoneda): string {
  return Object.entries(saldo)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => (a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b)))
    .map(([moneda, v]) => `${moneda} ${v.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`)
    .join(" + ");
}
