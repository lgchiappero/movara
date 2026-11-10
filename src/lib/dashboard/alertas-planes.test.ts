import { describe, it, expect } from "vitest";
import { alertasPlanes, formatSaldo, type PlanParaAlertas } from "./alertas-planes";

const AHORA = new Date(2026, 10, 11, 10); // miércoles 11/11/2026
const SEMANA = { desde: new Date(2026, 10, 9), hasta: new Date(2026, 10, 16) };
const VENCIDA = new Date(2026, 9, 15);
const ESTA_SEMANA = new Date(2026, 10, 13);
const FUTURA = new Date(2026, 11, 15);

function plan(p: Partial<PlanParaAlertas> & Pick<PlanParaAlertas, "unidadId" | "tipo">): PlanParaAlertas {
  return { moneda: "USD", cuotas: [], movimientos: [], ...p };
}

describe("alertasPlanes", () => {
  it("sin planes no hay alertas", () => {
    expect(alertasPlanes([], AHORA, SEMANA)).toEqual({
      cobroVencido: { unidades: 0, saldo: {} },
      pagoVencido: { unidades: 0, saldo: {} },
      cobroVenceSemana: { cuotas: 0, saldo: {} },
    });
  });

  it("pago total a proveedor (aunque sin cuota específica): la alerta desaparece", () => {
    const r = alertasPlanes(
      [plan({ unidadId: "u1", tipo: "pago", cuotas: [{ id: "q1", importe: 15000, vencimiento: VENCIDA }], movimientos: [{ cuotaId: null, importe: 15000 }] })],
      AHORA,
      SEMANA
    );
    expect(r.pagoVencido).toEqual({ unidades: 0, saldo: {} });
  });

  it("pago parcial: la alerta sigue con el saldo restante", () => {
    const r = alertasPlanes(
      [plan({ unidadId: "u1", tipo: "pago", cuotas: [{ id: "q1", importe: 15000, vencimiento: VENCIDA }], movimientos: [{ cuotaId: "q1", importe: 6000 }] })],
      AHORA,
      SEMANA
    );
    expect(r.pagoVencido).toEqual({ unidades: 1, saldo: { USD: 9000 } });
  });

  it("borrado del pago (plan sin movimientos): vuelve la alerta con el saldo completo", () => {
    const r = alertasPlanes(
      [plan({ unidadId: "u1", tipo: "pago", cuotas: [{ id: "q1", importe: 15000, vencimiento: VENCIDA }] })],
      AHORA,
      SEMANA
    );
    expect(r.pagoVencido).toEqual({ unidades: 1, saldo: { USD: 15000 } });
  });

  it("cuenta unidades (no cuotas ni planes) y suma el saldo por moneda, separando cobro y pago", () => {
    const vencida = (id: string, importe: number) => ({ id, importe, vencimiento: VENCIDA });
    const r = alertasPlanes(
      [
        plan({ unidadId: "u1", tipo: "pago", cuotas: [vencida("a", 100), vencida("b", 200)] }),
        plan({ unidadId: "u1", tipo: "pago", moneda: "ARS", cuotas: [vencida("c", 50000)] }),
        plan({ unidadId: "u2", tipo: "pago", cuotas: [vencida("d", 300)] }),
        plan({ unidadId: "u3", tipo: "cobro", cuotas: [vencida("e", 1000)] }),
      ],
      AHORA,
      SEMANA
    );
    expect(r.pagoVencido).toEqual({ unidades: 2, saldo: { USD: 600, ARS: 50000 } });
    expect(r.cobroVencido).toEqual({ unidades: 1, saldo: { USD: 1000 } });
  });

  it("vence esta semana: solo cobros con saldo, sin las ya vencidas ni las de otras semanas", () => {
    const r = alertasPlanes(
      [
        plan({
          unidadId: "u1",
          tipo: "cobro",
          cuotas: [
            { id: "semana", importe: 1000, vencimiento: ESTA_SEMANA },
            { id: "pagada", importe: 500, vencimiento: ESTA_SEMANA },
            { id: "futura", importe: 700, vencimiento: FUTURA },
            { id: "sin", importe: 700, vencimiento: null },
          ],
          movimientos: [{ cuotaId: "pagada", importe: 500 }, { cuotaId: "semana", importe: 250 }],
        }),
        plan({ unidadId: "u2", tipo: "pago", cuotas: [{ id: "p", importe: 900, vencimiento: ESTA_SEMANA }] }),
      ],
      AHORA,
      SEMANA
    );
    expect(r.cobroVenceSemana).toEqual({ cuotas: 1, saldo: { USD: 750 } });
    expect(r.cobroVencido.unidades).toBe(0);
    expect(r.pagoVencido.unidades).toBe(0);
  });

  it("ignora planes de un tipo desconocido", () => {
    const r = alertasPlanes(
      [plan({ unidadId: "u1", tipo: "otro", cuotas: [{ id: "q", importe: 1, vencimiento: VENCIDA }] })],
      AHORA,
      SEMANA
    );
    expect(r.cobroVencido.unidades + r.pagoVencido.unidades).toBe(0);
  });
});

describe("formatSaldo", () => {
  it("USD primero, después el resto en orden alfabético; omite los ceros", () => {
    expect(formatSaldo({ EUR: 10, ARS: 50000, USD: 1234.5, BRL: 0 })).toBe("USD 1.234,5 + ARS 50.000 + EUR 10");
  });
  it("una sola moneda o vacío", () => {
    expect(formatSaldo({ ARS: 1000 })).toBe("ARS 1.000");
    expect(formatSaldo({})).toBe("");
  });
});
