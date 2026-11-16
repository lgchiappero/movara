import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { paginaPadre, PADRE_POR_DEFECTO } from "../pagina-padre";
import { hayHistorialInterno, registrarRuta, reiniciarHistorial } from "../historial";
import { marcarSalidaProtegida, mensajeSalidaProtegida, useSalidaProtegida } from "../salida-protegida";

describe("paginaPadre", () => {
  it.each([
    ["/modelos/movara-duplex-76m2", "/modelos"],
    ["/modelos/flex", "/modelos"],
    ["/modelos/flex/", "/modelos"],
    ["/modelos/x?ref=wa#galeria", "/modelos"],
    ["/producto", "/modelos/flex"],
    ["/modelos", "/"],
    ["/agendar", "/"],
    ["/agendar/cancelar/abc", "/"],
    ["/recibo/token", "/"],
    ["/mi-pedido", "/"],
    ["/privacidad", "/"],
    ["/terminos", "/"],
    ["/no-existe", "/"],
    ["/productos-raros", "/"],
    ["/", "/"],
  ])("%s → %s", (ruta, padre) => {
    expect(paginaPadre(ruta)).toBe(padre);
  });

  it("lo que no tiene regla vuelve a la home", () => {
    expect(PADRE_POR_DEFECTO).toBe("/");
  });
});

describe("historial interno", () => {
  beforeEach(() => reiniciarHistorial());
  afterEach(() => vi.unstubAllGlobals());

  it("entrada directa: sin historial", () => {
    registrarRuta("/modelos/x");
    expect(hayHistorialInterno()).toBe(false);
  });

  it("navegando dentro del sitio: con historial; la misma ruta dos veces no suma", () => {
    registrarRuta("/");
    registrarRuta("/");
    expect(hayHistorialInterno()).toBe(false);
    registrarRuta("/modelos");
    expect(hayHistorialInterno()).toBe(true);
  });

  it("volver a la ruta anterior desapila: en la de entrada ya no hay historial", () => {
    registrarRuta("/modelos/x");
    registrarRuta("/modelos");
    registrarRuta("/modelos/x");
    expect(hayHistorialInterno()).toBe(false);
  });

  it("con Navigation API manda su índice, aunque la pila diga otra cosa", () => {
    registrarRuta("/");
    registrarRuta("/modelos");
    vi.stubGlobal("navigation", { currentEntry: { index: 0 } });
    expect(hayHistorialInterno()).toBe(false);
    vi.stubGlobal("navigation", { currentEntry: { index: 3 } });
    expect(hayHistorialInterno()).toBe(true);
  });

  it("Navigation API sin entrada actual: usa la pila", () => {
    vi.stubGlobal("navigation", { currentEntry: null });
    registrarRuta("/");
    registrarRuta("/faq");
    expect(hayHistorialInterno()).toBe(true);
  });
});

describe("salida protegida", () => {
  afterEach(() => act(() => marcarSalidaProtegida(null)));

  it("avisa a quien escucha y no re-notifica si no cambia", () => {
    const { result } = renderHook(() => useSalidaProtegida());
    expect(result.current).toBeNull();
    act(() => marcarSalidaProtegida("hay datos"));
    expect(result.current).toBe("hay datos");
    act(() => marcarSalidaProtegida("hay datos"));
    expect(mensajeSalidaProtegida()).toBe("hay datos");
    act(() => marcarSalidaProtegida(null));
    expect(result.current).toBeNull();
  });
});

describe("salida protegida en el servidor", () => {
  it("el HTML del server nunca trae el aviso", () => {
    marcarSalidaProtegida("hay datos");
    function Probe() {
      return createElement("span", null, useSalidaProtegida() ?? "nada");
    }
    expect(renderToString(createElement(Probe))).toContain("nada");
    marcarSalidaProtegida(null);
  });
});
