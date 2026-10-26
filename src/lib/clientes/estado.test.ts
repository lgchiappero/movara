import { describe, it, expect } from "vitest";
import {
  calcularEstadoAutomatico,
  resolverEstado,
  ordenarClientes,
  cambioEstadoClienteSchema,
  esEstadoCliente,
  rangoEstado,
} from "@/lib/clientes/estado";

const sinNada = { estadosPedido: [], tieneUnidad: false, tieneReciboConfirmado: false };

describe("calcularEstadoAutomatico", () => {
  it.each([
    [sinNada, "interesado"],
    [{ ...sinNada, estadosPedido: ["consulta"] }, "pedido_iniciado"],
    [{ ...sinNada, estadosPedido: ["consulta", "presupuestado"] }, "presupuestado"],
    [{ ...sinNada, estadosPedido: ["confirmado"] }, "comprador"],
    [{ ...sinNada, estadosPedido: ["en_produccion"] }, "comprador"],
    [{ ...sinNada, estadosPedido: ["en_transito"] }, "comprador"],
    [{ ...sinNada, estadosPedido: ["en_aduana", "consulta"] }, "comprador"],
    [{ ...sinNada, tieneUnidad: true }, "comprador"],
    [{ ...sinNada, estadosPedido: ["entregado"] }, "entregado"],
    [{ ...sinNada, tieneUnidad: true, tieneReciboConfirmado: true }, "entregado"],
  ] as const)("%o → %s", (datos, esperado) => {
    expect(calcularEstadoAutomatico({ ...datos, estadosPedido: [...datos.estadosPedido] })).toBe(esperado);
  });
});

describe("resolverEstado", () => {
  const auto = (estado: string) => ({ estado, estadoManual: false, estadoAutomatico: estado });

  it("automático: sigue al cálculo", () => {
    expect(resolverEstado(auto("pedido_iniciado"), "comprador")).toEqual({ estado: "comprador", estadoAutomatico: "comprador" });
  });

  it("nada que cambiar → null", () => {
    expect(resolverEstado(auto("comprador"), "comprador")).toBeNull();
  });

  it("automático con estado desfasado del guardado: corrige solo el estado", () => {
    expect(resolverEstado({ estado: "interesado", estadoManual: false, estadoAutomatico: "comprador" }, "comprador")).toEqual({
      estado: "comprador",
    });
  });

  it("manual más avanzado: se respeta aunque el cálculo cambie (solo guarda el automático)", () => {
    const manual = { estado: "comprador", estadoManual: true, estadoAutomatico: "pedido_iniciado" };
    expect(resolverEstado(manual, "presupuestado")).toEqual({ estadoAutomatico: "presupuestado" });
    expect(resolverEstado(manual, "pedido_iniciado")).toBeNull();
  });

  it("un pedido que lleva al cliente más allá del manual lo actualiza y deja de ser manual", () => {
    const manual = { estado: "presupuestado", estadoManual: true, estadoAutomatico: "pedido_iniciado" };
    expect(resolverEstado(manual, "comprador")).toEqual({
      estado: "comprador",
      estadoAutomatico: "comprador",
      estadoManual: false,
      estadoManualEn: null,
      estadoManualPor: null,
    });
  });

  it("un manual bajado a mano no vuelve a subir con un recálculo que no avanza", () => {
    const bajado = { estado: "interesado", estadoManual: true, estadoAutomatico: "comprador" };
    expect(resolverEstado(bajado, "comprador")).toBeNull();
    // Pero si los pedidos avanzan más allá del automático anterior, sí.
    expect(resolverEstado(bajado, "entregado")).toMatchObject({ estado: "entregado", estadoManual: false });
  });
});

describe("ordenarClientes", () => {
  it("primero los pedido iniciado, después el resto; el más reciente primero en cada grupo", () => {
    const d = (dia: number) => new Date(`2026-10-${String(dia).padStart(2, "0")}T00:00:00Z`);
    const lista = [
      { id: "a", estado: "comprador", updatedAt: d(20) },
      { id: "b", estado: "pedido_iniciado", updatedAt: d(1) },
      { id: "c", estado: "interesado", updatedAt: d(25) },
      { id: "d", estado: "pedido_iniciado", updatedAt: d(10) },
    ];
    expect(ordenarClientes(lista).map((c) => c.id)).toEqual(["d", "b", "c", "a"]);
    expect(lista[0].id).toBe("a");
  });
});

describe("cambioEstadoClienteSchema y helpers", () => {
  it("acepta un estado o volver a automático, y nada más", () => {
    expect(cambioEstadoClienteSchema.safeParse({ estado: "comprador" }).success).toBe(true);
    expect(cambioEstadoClienteSchema.safeParse({ automatico: true }).success).toBe(true);
    expect(cambioEstadoClienteSchema.safeParse({ estado: "otro" }).success).toBe(false);
    expect(cambioEstadoClienteSchema.safeParse({ automatico: false }).success).toBe(false);
  });

  it("esEstadoCliente y rangoEstado", () => {
    expect(esEstadoCliente("entregado")).toBe(true);
    expect(esEstadoCliente("x")).toBe(false);
    expect(rangoEstado("interesado")).toBeLessThan(rangoEstado("entregado"));
  });
});
