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

  it("los movimientos de otras cuotas o sin cuota no cuentan", () => {
    const [c] = cuotasSaldables([cuota("c1", 5000)], [
      { cuotaId: "c2", importe: 4000 },
      { cuotaId: null, importe: 4000 },
    ]);
    expect(c.estado).toBe("pendiente");
    expect(c.restante).toBe(5000);
  });

  it("excluye las cuotas pagadas, por estado o porque ya no les queda saldo", () => {
    const res = cuotasSaldables(
      [cuota("c1", 5000, "pagado"), cuota("c2", 3000), cuota("c3", 1000)],
      [{ cuotaId: "c2", importe: 3000 }]
    );
    expect(res.map((c) => c.id)).toEqual(["c3"]);
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
