// Tolerancia para comparar sumas de floats — misma que calc.ts.
const EPSILON = 0.01;

export type EstadoCuotaSaldable = "pendiente" | "parcial" | "vencido";

export type CuotaSaldable = {
  id: string;
  descripcion: string;
  importe: number;
  /** Lo que todavía falta pagar de la cuota (importe − movimientos ya
   * imputados a ella). */
  restante: number;
  estado: EstadoCuotaSaldable;
};

const ESTADO_LABEL: Record<EstadoCuotaSaldable, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  vencido: "Vencida",
};

/** Cuotas de un acuerdo que todavía se pueden saldar, con su estado real.
 * La base solo guarda pendiente/pagado/vencido por cuota — "parcial" se
 * deriva acá de los movimientos ya imputados a cada cuota. Se excluyen las
 * pagadas (por estado o porque ya no les queda saldo). Las vencidas se
 * mantienen: son justamente las que más urge saldar. */
export function cuotasSaldables(
  cuotas: { id: string; descripcion: string; importe: number; estado: string }[],
  movimientos: { cuotaId: string | null; importe: number }[]
): CuotaSaldable[] {
  return cuotas.flatMap((c) => {
    if (c.estado === "pagado") return [];
    const pagado = movimientos.filter((m) => m.cuotaId === c.id).reduce((acc, m) => acc + m.importe, 0);
    const restante = c.importe - pagado;
    if (restante <= EPSILON) return [];
    const estado: EstadoCuotaSaldable =
      c.estado === "vencido" ? "vencido" : pagado > EPSILON ? "parcial" : "pendiente";
    return [{ id: c.id, descripcion: c.descripcion, importe: c.importe, restante, estado }];
  });
}

function formatMonto(moneda: string, valor: number): string {
  return `${moneda} ${valor.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

/** "Anticipo 30% — USD 7.410 — Pendiente". En las parciales agrega cuánto
 * resta: "Cuota 1/3 — USD 5.000 — Parcial (resta USD 2.000)". */
export function etiquetaCuota(c: CuotaSaldable, moneda: string): string {
  const estado =
    c.estado === "parcial" ? `${ESTADO_LABEL.parcial} (resta ${formatMonto(moneda, c.restante)})` : ESTADO_LABEL[c.estado];
  return `${c.descripcion} — ${formatMonto(moneda, c.importe)} — ${estado}`;
}
