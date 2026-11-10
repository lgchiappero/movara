import { describe, it, expect } from "vitest";
import { cuotasSaldables, etiquetaCuota } from "./cuotas-saldables";

const cuota = (id: string, importe: number, estado = "pendiente", descripcion = `Cuota ${id}`) => ({
  id,
  descripcion,
  importe,
  estado,
});

describe("cuotasSaldables", () => {
  it("sin cuotas devuelve una lista vacía", () => {
    expect(cuotasSaldables([], [])).toEqual([]);
  });

  it("cuota sin movimientos: pendiente, resta el importe completo", () => {
    expect(cuotasSaldables([cuota("c1", 7410)], [])).toEqual([
      { id: "c1", descripcion: "Cuota c1", importe: 7410, restante: 7410, estado: "pendiente" },
    ]);
  });

  it("cuota con movimientos imputados que no la completan: parcial, con lo que resta", () => {
    const [c] = cuotasSaldables([cuota("c1", 5000)], [
      { cuotaId: "c1", importe: 2000 },
      { cuotaId: "c1", importe: 1000 },
    ]);
    expect(c.estado).toBe("parcial");
    expect(c.restante).toBe(2000);
  });

  it("los movimientos de cuotas de otro plan cuentan como pagos sin cuota específica", () => {
    // c2 no es de este plan: se imputa como un pago general, igual que el
    // de cuotaId null.
    const [c] = cuotasSaldables([cuota("c1", 5000)], [
      { cuotaId: "c2", importe: 1000 },
      { cuotaId: null, importe: 1500 },
    ]);
    expect(c.estado).toBe("parcial");
    expect(c.restante).toBe(2500);
  });

  it("un pago sin cuota específica salda primero la que vence antes", () => {
    const res = cuotasSaldables(
      [
        { ...cuota("c2", 3000), vencimiento: "2026-12-01" },
        { ...cuota("c1", 2000), vencimiento: "2026-11-01" },
      ],
      [{ cuotaId: null, importe: 2500 }],
      new Date(2026, 9, 1)
    );
    expect(res).toEqual([{ id: "c2", descripcion: "Cuota c2", importe: 3000, restante: 2500, estado: "parcial" }]);
  });

  it("excluye las cuotas que ya no tienen saldo, por el saldo real y no por el campo estado", () => {
    const res = cuotasSaldables(
      [cuota("c1", 5000, "pagado"), cuota("c2", 3000), cuota("c3", 1000)],
      [{ cuotaId: "c2", importe: 3000 }]
    );
    // c1 dice "pagado" pero no tiene pagos: sigue saldable.
    expect(res.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("una cuota vencida por fecha se ofrece como vencida aunque su estado diga pendiente", () => {
    const [c] = cuotasSaldables([{ ...cuota("c1", 1000), vencimiento: "2026-01-01" }], [], new Date(2026, 5, 1));
    expect(c.estado).toBe("vencido");
  });

  it("tolera errores de redondeo al considerar una cuota saldada", () => {
    expect(cuotasSaldables([cuota("c1", 0.3)], [{ cuotaId: "c1", importe: 0.1 + 0.2 }])).toEqual([]);
  });

  it("mantiene las vencidas (impagas) con estado 'vencido', aunque tengan pagos parciales", () => {
    const [c] = cuotasSaldables([cuota("c1", 5000, "vencido")], [{ cuotaId: "c1", importe: 1000 }]);
    expect(c.estado).toBe("vencido");
    expect(c.restante).toBe(4000);
  });
});

describe("etiquetaCuota", () => {
  it("formato 'descripción — moneda importe — estado'", () => {
    const [c] = cuotasSaldables([cuota("c1", 7410, "pendiente", "Anticipo 30%")], []);
    expect(etiquetaCuota(c, "USD")).toBe("Anticipo 30% — USD 7.410 — Pendiente");
  });

  it("parcial: indica cuánto resta", () => {
    const [c] = cuotasSaldables([cuota("c1", 5000, "pendiente", "Cuota 1/3")], [{ cuotaId: "c1", importe: 3000 }]);
    expect(etiquetaCuota(c, "USD")).toBe("Cuota 1/3 — USD 5.000 — Parcial (resta USD 2.000)");
  });

  it("vencida, en ARS y con decimales", () => {
    const [c] = cuotasSaldables([cuota("c1", 1250.5, "vencido", "Saldo final")], []);
    expect(etiquetaCuota(c, "ARS")).toBe("Saldo final — ARS 1.250,5 — Vencida");
  });
});
