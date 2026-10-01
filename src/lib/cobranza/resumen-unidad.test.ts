import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { movimiento: { findMany: mockFindMany } } }));

import {
  resumirMovimientos,
  resumenCobranzaPorUnidad,
  RESUMEN_COBRANZA_VACIO,
  type MovimientoParaResumen,
} from "./resumen-unidad";

function mov(
  unidadId: string,
  tipo: "cobro" | "pago",
  fecha: string,
  importe: number,
  opts: { moneda?: string; concepto?: string } = {}
): MovimientoParaResumen {
  return {
    fecha: new Date(fecha),
    importe,
    acuerdo: {
      unidadId,
      tipo,
      moneda: opts.moneda ?? "USD",
      concepto: opts.concepto ?? (tipo === "cobro" ? "venta" : "fabrica"),
    },
  };
}

describe("resumirMovimientos", () => {
  it("sin movimientos devuelve un mapa vacío", () => {
    expect(resumirMovimientos([]).size).toBe(0);
  });

  it("suma los cobros en USD y toma la primera y la última fecha de cobro sin importar el orden", () => {
    const r = resumirMovimientos([
      mov("u1", "cobro", "2026-03-01", 10000),
      mov("u1", "cobro", "2026-01-15", 5000),
      mov("u1", "cobro", "2026-02-10", 2500),
    ]).get("u1")!;
    expect(r.cobradoUSD).toBe(17500);
    expect(r.primerCobroFecha).toEqual(new Date("2026-01-15"));
    expect(r.ultimoCobroFecha).toEqual(new Date("2026-03-01"));
  });

  it("los cobros en ARS cuentan para las fechas pero no se suman al cobrado en USD", () => {
    const r = resumirMovimientos([
      mov("u1", "cobro", "2026-01-15", 5000),
      mov("u1", "cobro", "2026-04-01", 9_000_000, { moneda: "ARS" }),
    ]).get("u1")!;
    expect(r.cobradoUSD).toBe(5000);
    expect(r.ultimoCobroFecha).toEqual(new Date("2026-04-01"));
  });

  it("toma el primer pago a fábrica e ignora pagos de otros conceptos", () => {
    const r = resumirMovimientos([
      mov("u1", "pago", "2026-02-20", 8000, { concepto: "fabrica" }),
      mov("u1", "pago", "2026-02-05", 1000, { concepto: "flete" }),
      mov("u1", "pago", "2026-02-12", 8000, { concepto: "fabrica" }),
    ]).get("u1")!;
    expect(r.primerPagoFabricaFecha).toEqual(new Date("2026-02-12"));
    expect(r.primerCobroFecha).toBeNull();
    expect(r.cobradoUSD).toBe(0);
  });

  it("los pagos no se suman al cobrado", () => {
    const r = resumirMovimientos([
      mov("u1", "cobro", "2026-01-15", 5000),
      mov("u1", "pago", "2026-02-12", 8000),
    ]).get("u1")!;
    expect(r.cobradoUSD).toBe(5000);
  });

  it("separa los resúmenes por unidad", () => {
    const mapa = resumirMovimientos([
      mov("u1", "cobro", "2026-01-15", 5000),
      mov("u2", "cobro", "2026-02-01", 7000),
      mov("u2", "pago", "2026-02-12", 3000),
    ]);
    expect(mapa.get("u1")).toEqual({
      primerCobroFecha: new Date("2026-01-15"),
      ultimoCobroFecha: new Date("2026-01-15"),
      cobradoUSD: 5000,
      primerPagoFabricaFecha: null,
    });
    expect(mapa.get("u2")!.cobradoUSD).toBe(7000);
    expect(mapa.get("u2")!.primerPagoFabricaFecha).toEqual(new Date("2026-02-12"));
  });

  it("no muta el RESUMEN_COBRANZA_VACIO compartido", () => {
    resumirMovimientos([mov("u1", "cobro", "2026-01-15", 5000)]);
    expect(RESUMEN_COBRANZA_VACIO).toEqual({
      primerCobroFecha: null,
      ultimoCobroFecha: null,
      cobradoUSD: 0,
      primerPagoFabricaFecha: null,
    });
  });
});

describe("resumenCobranzaPorUnidad", () => {
  beforeEach(() => mockFindMany.mockReset());

  it("sin unidades no consulta la base", async () => {
    expect((await resumenCobranzaPorUnidad([])).size).toBe(0);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("lee movimientos de cobro y de pago a fábrica de esas unidades en una sola query", async () => {
    mockFindMany.mockResolvedValue([mov("u1", "cobro", "2026-01-15", 5000)]);
    const mapa = await resumenCobranzaPorUnidad(["u1", "u2"]);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          acuerdo: {
            unidadId: { in: ["u1", "u2"] },
            OR: [{ tipo: "cobro" }, { tipo: "pago", concepto: "fabrica" }],
          },
        },
      })
    );
    expect(mapa.get("u1")!.cobradoUSD).toBe(5000);
    expect(mapa.has("u2")).toBe(false);
  });
});
