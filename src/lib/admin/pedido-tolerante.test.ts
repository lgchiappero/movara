import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique } = vi.hoisted(() => ({ mockFindUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { configuracionPedido: { findUnique: mockFindUnique } } }));

import { buscarPedidoTolerante, columnaFaltante } from "./pedido-tolerante";

/** El error tal cual lo dio producción el 3/11/2026 (digest 2875324328). */
function errorColumnaFaltante(columna = "desgloseEstimado") {
  return Object.assign(
    new Error(
      "\nInvalid `prisma.configuracionPedido.findUnique()` invocation:\n\n\n" +
        `The column \`configuraciones_pedido.${columna}\` does not exist in the current database.`
    ),
    { code: "P2022", meta: { modelName: "ConfiguracionPedido" }, clientVersion: "7.10.0" }
  );
}

beforeEach(() => {
  mockFindUnique.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("columnaFaltante", () => {
  it("saca la columna del mensaje de Prisma 7 (sin meta.column)", () => {
    expect(columnaFaltante(errorColumnaFaltante())).toBe("desgloseEstimado");
  });

  it("usa meta.column si viene, con o sin tabla", () => {
    expect(columnaFaltante({ code: "P2022", meta: { column: "configuraciones_pedido.otraColumna" } })).toBe("otraColumna");
    expect(columnaFaltante({ code: "P2022", meta: { column: "sola" } })).toBe("sola");
  });

  it("otros errores no son una columna faltante", () => {
    expect(columnaFaltante(new Error("conexión caída"))).toBeNull();
    expect(columnaFaltante({ code: "P2025", message: "The column `a.b` does not exist" })).toBeNull();
    expect(columnaFaltante({ code: "P2022", message: "sin el formato esperado" })).toBeNull();
    expect(columnaFaltante({ code: "P2022" })).toBeNull();
    expect(columnaFaltante(null)).toBeNull();
  });
});

describe("buscarPedidoTolerante", () => {
  it("con la base al día devuelve el pedido sin campos faltantes", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "p1", desgloseEstimado: { total: 1 } });
    expect(await buscarPedidoTolerante("p1")).toEqual({ pedido: { id: "p1", desgloseEstimado: { total: 1 } }, camposNoDisponibles: [] });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("si falta la columna desgloseEstimado (lo que pasó en producción) reintenta sin ella y la devuelve en null", async () => {
    mockFindUnique.mockRejectedValueOnce(errorColumnaFaltante()).mockResolvedValueOnce({ id: "p1", clienteNombre: "Ana" });
    const r = await buscarPedidoTolerante("p1");
    expect(r).toEqual({ pedido: { id: "p1", clienteNombre: "Ana", desgloseEstimado: null }, camposNoDisponibles: ["desgloseEstimado"] });
    expect(mockFindUnique).toHaveBeenLastCalledWith({ where: { id: "p1" }, omit: { desgloseEstimado: true } });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Falta la columna desgloseEstimado"));
  });

  it("tolera varias columnas faltantes a la vez", async () => {
    mockFindUnique
      .mockRejectedValueOnce(errorColumnaFaltante("a"))
      .mockRejectedValueOnce(errorColumnaFaltante("b"))
      .mockResolvedValueOnce({ id: "p1" });
    expect((await buscarPedidoTolerante("p1"))?.camposNoDisponibles).toEqual(["a", "b"]);
    expect(mockFindUnique).toHaveBeenLastCalledWith({ where: { id: "p1" }, omit: { a: true, b: true } });
  });

  it("null si el pedido no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect(await buscarPedidoTolerante("nope")).toBeNull();
  });

  it("otros errores se propagan", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("conexión caída"));
    await expect(buscarPedidoTolerante("p1")).rejects.toThrow("conexión caída");
  });

  it("si la misma columna sigue faltando, o faltan demasiadas, se rinde", async () => {
    mockFindUnique.mockRejectedValue(errorColumnaFaltante());
    await expect(buscarPedidoTolerante("p1")).rejects.toThrow("desgloseEstimado");
    mockFindUnique.mockReset();
    let n = 0;
    mockFindUnique.mockImplementation(() => Promise.reject(errorColumnaFaltante(`c${n++}`)));
    await expect(buscarPedidoTolerante("p1")).rejects.toThrow("c5");
    expect(mockFindUnique).toHaveBeenCalledTimes(6);
  });
});
