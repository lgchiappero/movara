import { describe, it, expect } from "vitest";
import { prorratear, totalesLogistica, ordenarCostos, serializeCosto, type CostoLogisticaRow } from "./logistica";

describe("prorratear", () => {
  it("divide en partes iguales", () => {
    expect(prorratear(4200, ["a", "b"])).toEqual([
      { unidadId: "a", importe: 2100 },
      { unidadId: "b", importe: 2100 },
    ]);
  });
  it("la diferencia de redondeo va a la última; la suma da exacto", () => {
    const partes = prorratear(100, ["a", "b", "c"]);
    expect(partes.map((p) => p.importe)).toEqual([33.33, 33.33, 33.34]);
    expect(partes.reduce((a, p) => a + p.importe, 0)).toBeCloseTo(100, 10);
  });
  it("sin unidades → vacío", () => {
    expect(prorratear(100, [])).toEqual([]);
  });
});

const costo = (over: Partial<CostoLogisticaRow>): CostoLogisticaRow => ({
  id: "c",
  envioId: "e1",
  envioNumeroPI: "PI",
  envioContenedor: null,
  concepto: "flete",
  descripcion: null,
  moneda: "USD",
  importe: 100,
  fecha: "2026-09-01T00:00:00.000Z",
  estado: "pagado",
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  prorrateado: false,
  prorrateos: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

describe("totalesLogistica", () => {
  it("pagado y pendiente por moneda; ignora otras monedas", () => {
    expect(
      totalesLogistica([
        costo({ importe: 100 }),
        costo({ importe: 50, moneda: "ARS" }),
        costo({ importe: 30, estado: "pendiente" }),
        costo({ importe: 999, moneda: "EUR" }),
      ])
    ).toEqual({ pagado: { USD: 100, ARS: 50 }, pendiente: { USD: 30, ARS: 0 } });
  });
});

describe("ordenarCostos", () => {
  it("del más reciente al más viejo; empate por fecha de alta", () => {
    const orden = ordenarCostos([
      costo({ id: "viejo", fecha: "2026-01-01T00:00:00.000Z" }),
      costo({ id: "nuevo", fecha: "2026-10-01T00:00:00.000Z" }),
      costo({ id: "empate", fecha: "2026-10-01T00:00:00.000Z", createdAt: "2026-10-02T00:00:00.000Z" }),
    ]).map((c) => c.id);
    expect(orden).toEqual(["empate", "nuevo", "viejo"]);
  });
});

describe("serializeCosto", () => {
  it("aplana el envío y los prorrateos, fechas en ISO", () => {
    expect(
      serializeCosto({
        id: "c1",
        envioId: "e1",
        envio: { numeroPI: "PI-1", numeroContenedor: "MSCU1" },
        concepto: "vep",
        descripcion: null,
        moneda: "ARS",
        importe: 1000,
        fecha: new Date("2026-09-01T00:00:00.000Z"),
        estado: "pendiente",
        comprobanteUrl: null,
        notas: "x",
        prorrateado: true,
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        prorrateos: [{ unidadId: "u1", importe: 1000, unidad: { numeroUnidad: "MOV-1" } }],
      })
    ).toEqual({
      id: "c1",
      envioId: "e1",
      envioNumeroPI: "PI-1",
      envioContenedor: "MSCU1",
      concepto: "vep",
      descripcion: null,
      moneda: "ARS",
      importe: 1000,
      fecha: "2026-09-01T00:00:00.000Z",
      estado: "pendiente",
      comprobanteUrl: null,
      comprobanteSignedUrl: null,
      notas: "x",
      prorrateado: true,
      prorrateos: [{ unidadId: "u1", unidadNumero: "MOV-1", importe: 1000 }],
      createdAt: "2026-09-02T00:00:00.000Z",
    });
  });
});
