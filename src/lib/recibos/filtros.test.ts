import { describe, it, expect } from "vitest";
import { filtrarRecibos, opcionesUnicas, FILTROS_RECIBOS_VACIOS, type FilaRecibo } from "./filtros";

const fila = (o: Partial<FilaRecibo>): FilaRecibo => ({
  id: "r",
  numeroRecibo: "REC-2026-001",
  estado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana",
  unidadId: "u1",
  numeroUnidad: "U-001",
  modelo: "Flex 38",
  fechaEntrega: "2026-10-08T00:00:00.000Z",
  confirmadoAt: null,
  ...o,
});

const FILAS = [
  fila({ id: "a" }),
  fila({ id: "b", estado: "confirmado", clienteId: "c2", clienteNombre: "Beto", unidadId: "u2", numeroUnidad: "U-002", fechaEntrega: "2026-09-15T00:00:00.000Z" }),
  fila({ id: "c", estado: "anulado", fechaEntrega: "2026-10-31T00:00:00.000Z" }),
];

describe("filtrarRecibos", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarRecibos(FILAS, FILTROS_RECIBOS_VACIOS).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
  it("por estado, unidad y cliente", () => {
    expect(filtrarRecibos(FILAS, { ...FILTROS_RECIBOS_VACIOS, estado: "confirmado" }).map((r) => r.id)).toEqual(["b"]);
    expect(filtrarRecibos(FILAS, { ...FILTROS_RECIBOS_VACIOS, unidadId: "u1" }).map((r) => r.id)).toEqual(["a", "c"]);
    expect(filtrarRecibos(FILAS, { ...FILTROS_RECIBOS_VACIOS, clienteId: "c2" }).map((r) => r.id)).toEqual(["b"]);
  });
  it("por período de la fecha de entrega [desde, hasta)", () => {
    const rango = { desde: new Date(2026, 9, 1), hasta: new Date(2026, 9, 31) };
    expect(filtrarRecibos(FILAS, { ...FILTROS_RECIBOS_VACIOS, rango }).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("opcionesUnicas", () => {
  it("deduplica y ordena unidades y clientes", () => {
    expect(opcionesUnicas(FILAS, "unidad")).toEqual([
      { value: "u2", label: "U-002 · Beto" },
      { value: "u1", label: "U-001 · Ana" },
    ].sort((x, y) => x.label.localeCompare(y.label, "es")));
    expect(opcionesUnicas(FILAS, "cliente")).toEqual([
      { value: "c1", label: "Ana" },
      { value: "c2", label: "Beto" },
    ]);
  });
});
