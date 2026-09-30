import { describe, it, expect } from "vitest";
import { sumaImportes, estadoAcuerdo, estadoCuota, margenPorcentaje } from "@/lib/cobranza/calc";

describe("sumaImportes", () => {
  it("0 sin movimientos", () => {
    expect(sumaImportes([])).toBe(0);
  });

  it("suma los importes", () => {
    expect(sumaImportes([{ importe: 100 }, { importe: 250 }])).toBe(350);
  });
});

describe("estadoAcuerdo", () => {
  it("pendiente sin movimientos ni cuotas vencidas", () => {
    expect(estadoAcuerdo(1000, 0, [{ estado: "pendiente" }])).toBe("pendiente");
  });

  it("parcial cuando se pagó algo pero no todo", () => {
    expect(estadoAcuerdo(1000, 400, [{ estado: "pendiente" }])).toBe("parcial");
  });

  it("saldado cuando lo pagado cubre el total", () => {
    expect(estadoAcuerdo(1000, 1000, [{ estado: "pendiente" }])).toBe("saldado");
  });

  it("saldado tolera un centavo de diferencia por redondeo de floats", () => {
    expect(estadoAcuerdo(1000, 999.995, [])).toBe("saldado");
  });

  it("vencido cuando alguna cuota está vencida y no se saldó el total", () => {
    expect(estadoAcuerdo(1000, 300, [{ estado: "vencido" }])).toBe("vencido");
  });

  it("saldado gana sobre vencido si ya se completó el pago total", () => {
    expect(estadoAcuerdo(1000, 1000, [{ estado: "vencido" }])).toBe("saldado");
  });
});

describe("estadoCuota", () => {
  const hoy = new Date("2026-06-15T00:00:00.000Z");

  it("pagado cuando lo pagado cubre el importe de la cuota", () => {
    expect(estadoCuota(500, 500, null, hoy)).toBe("pagado");
  });

  it("pagado tolera un centavo de diferencia", () => {
    expect(estadoCuota(500, 499.999, null, hoy)).toBe("pagado");
  });

  it("vencido cuando no está pagada y el vencimiento ya pasó", () => {
    expect(estadoCuota(500, 0, new Date("2026-01-01"), hoy)).toBe("vencido");
  });

  it("pendiente cuando no está pagada y el vencimiento es futuro", () => {
    expect(estadoCuota(500, 0, new Date("2026-12-01"), hoy)).toBe("pendiente");
  });

  it("pendiente cuando no tiene vencimiento (pago único sin fecha)", () => {
    expect(estadoCuota(500, 0, null, hoy)).toBe("pendiente");
  });
});

describe("margenPorcentaje", () => {
  it("null cuando no hay nada cobrado", () => {
    expect(margenPorcentaje(0, 100)).toBeNull();
  });

  it("null cuando lo cobrado es negativo (dato inconsistente, defensivo)", () => {
    expect(margenPorcentaje(-1, 0)).toBeNull();
  });

  it("calcula el margen como porcentaje sobre lo cobrado", () => {
    expect(margenPorcentaje(1000, 600)).toBe(40);
  });

  it("puede ser negativo si se pagó más de lo cobrado", () => {
    expect(margenPorcentaje(1000, 1500)).toBe(-50);
  });

  it("100% cuando no hubo ningún pago", () => {
    expect(margenPorcentaje(1000, 0)).toBe(100);
  });
});
