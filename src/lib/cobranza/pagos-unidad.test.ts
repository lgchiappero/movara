import { describe, it, expect } from "vitest";
import { estadoPagoUnidad, categoriaCosto } from "./pagos-unidad";
import type { AcuerdoConDetalle } from "./types";

const HOY = new Date("2026-10-07T00:00:00");

function plan(over: Partial<AcuerdoConDetalle>): AcuerdoConDetalle {
  return {
    id: "p1",
    unidadId: "u1",
    unidadNumero: "MOV-1",
    unidadModelo: null,
    unidadEstado: "pendiente",
    clienteId: "c1",
    clienteNombre: "Ana",
    tipo: "pago",
    concepto: "fabrica",
    descripcion: null,
    contraparte: "Heshi",
    moneda: "USD",
    totalAcordado: 1000,
    notas: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}
const mov = (importe: number) => ({
  id: `m${importe}`,
  fecha: "2026-09-10T00:00:00.000Z",
  importe,
  modalidad: "transferencia",
  cuotaId: null,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a@x.com",
});

describe("estadoPagoUnidad", () => {
  it("pagado / parcial / pendiente según lo pagado", () => {
    expect(estadoPagoUnidad(plan({ movimientos: [mov(1000)] }), HOY)).toBe("pagado");
    expect(estadoPagoUnidad(plan({ movimientos: [mov(400)] }), HOY)).toBe("parcial");
    expect(estadoPagoUnidad(plan({}), HOY)).toBe("pendiente");
  });

  it("vencido si una cuota impaga ya venció (aunque haya pagos parciales); pagado gana", () => {
    const cuotas = [{ id: "q", descripcion: "Anticipo", importe: 500, vencimiento: "2026-09-01T00:00:00", estado: "pendiente" }];
    expect(estadoPagoUnidad(plan({ cuotas }), HOY)).toBe("vencido");
    expect(estadoPagoUnidad(plan({ cuotas, movimientos: [mov(200)] }), HOY)).toBe("vencido");
    expect(estadoPagoUnidad(plan({ cuotas, movimientos: [mov(1000)] }), HOY)).toBe("pagado");
  });
});

describe("categoriaCosto", () => {
  it("fábrica / nacional / internacional (pagos viejos por unidad)", () => {
    expect(categoriaCosto("fabrica")).toBe("fabrica");
    for (const c of ["transporte", "grua", "instalacion", "otro"]) expect(categoriaCosto(c)).toBe("nacional");
    for (const c of ["flete", "seguro", "aduana", "despachante", "impuestos"]) expect(categoriaCosto(c)).toBe("internacional");
  });
});
