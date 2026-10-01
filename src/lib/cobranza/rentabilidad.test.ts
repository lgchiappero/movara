import { describe, it, expect } from "vitest";
import { rentabilidadPorUnidad, type ProrrateoUSD } from "./rentabilidad";
import type { AcuerdoConDetalle } from "./types";

const PERIODO = { desde: "2026-09-01T00:00:00.000Z", hasta: "2026-10-01T00:00:00.000Z" };

function acuerdo(over: Partial<AcuerdoConDetalle>): AcuerdoConDetalle {
  return {
    id: "a",
    unidadId: "u1",
    unidadNumero: "MOV-1",
    unidadModelo: "Flex 38",
    unidadEstado: "en_transito",
    clienteId: "c1",
    clienteNombre: "Ana",
    tipo: "cobro",
    concepto: "venta",
    descripcion: null,
    contraparte: "Ana",
    moneda: "USD",
    totalAcordado: 0,
    notas: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}
const mov = (importe: number, fecha = "2026-09-15T00:00:00.000Z") => ({
  id: `m${importe}${fecha}`,
  fecha,
  importe,
  modalidad: "transferencia",
  cuotaId: null,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a",
});
const prorrateo = (importe: number, fecha = "2026-09-20T00:00:00.000Z", unidadId = "u1"): ProrrateoUSD => ({
  unidadId,
  unidadNumero: unidadId === "u1" ? "MOV-1" : "MOV-2",
  unidadModelo: null,
  unidadEstado: "en_transito",
  clienteNombre: "Ana",
  importe,
  fecha,
});

describe("rentabilidadPorUnidad", () => {
  it("cobrado − fábrica − logística nacional − logística internacional prorrateada = margen real", () => {
    const [r] = rentabilidadPorUnidad(
      [acuerdo({ movimientos: [mov(50000)] })],
      [
        acuerdo({ id: "f", tipo: "pago", concepto: "fabrica", movimientos: [mov(30000)] }),
        acuerdo({ id: "g", tipo: "pago", concepto: "grua", movimientos: [mov(800)] }),
        acuerdo({ id: "t", tipo: "pago", concepto: "transporte", movimientos: [mov(1200)] }),
        // Pago viejo por unidad de flete → cuenta como internacional.
        acuerdo({ id: "fl", tipo: "pago", concepto: "flete", movimientos: [mov(500)] }),
      ],
      [prorrateo(2100)],
      PERIODO
    );
    expect(r).toMatchObject({
      unidadNumero: "MOV-1",
      cobrado: 50000,
      fabrica: 30000,
      logisticaNacional: 2000,
      logisticaInternacional: 2600,
      margenUSD: 15400,
    });
    expect(r.margenPct).toBeCloseTo(30.8, 5);
  });

  it("solo cuenta lo que cae dentro del período, y solo USD", () => {
    const [r] = rentabilidadPorUnidad(
      [acuerdo({ movimientos: [mov(1000), mov(9999, "2026-08-31T00:00:00.000Z")] }), acuerdo({ id: "ars", moneda: "ARS", movimientos: [mov(5)] })],
      [acuerdo({ id: "f", tipo: "pago", concepto: "fabrica", movimientos: [mov(400, "2026-10-01T00:00:00.000Z")] })],
      [prorrateo(100, "2026-10-05T00:00:00.000Z")],
      PERIODO
    );
    expect(r).toMatchObject({ cobrado: 1000, fabrica: 0, logisticaInternacional: 0, margenUSD: 1000 });
  });

  it("una unidad que solo tiene costos (sin cobros todavía) aparece con margen negativo y % nulo", () => {
    const filas = rentabilidadPorUnidad([], [], [prorrateo(700, undefined, "u2")], PERIODO);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ unidadNumero: "MOV-2", cobrado: 0, logisticaInternacional: 700, margenUSD: -700, margenPct: null });
  });

  it("un pago del día 1 (medianoche UTC) cuenta en ese mes aunque el período arranque a medianoche de Argentina", () => {
    const periodoAR = { desde: "2026-10-01T03:00:00.000Z", hasta: "2026-11-01T03:00:00.000Z" };
    const [r] = rentabilidadPorUnidad([acuerdo({ movimientos: [mov(1000, "2026-10-01T00:00:00.000Z")] })], [], [], periodoAR);
    expect(r.cobrado).toBe(1000);
  });
});
