import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  capturarOrigen,
  leerOrigen,
  datosDeLaVisita,
  CLAVE_ORIGEN,
  DURACION_ORIGEN_MS,
} from "@/lib/origen-visita/navegador";
import CapturaOrigen from "@/components/CapturaOrigen";

const AHORA = Date.parse("2026-10-26T12:00:00.000Z");

function visitar(url: string, referrer = "") {
  window.history.replaceState(null, "", url);
  Object.defineProperty(document, "referrer", { configurable: true, value: referrer });
}

// El jsdom de este entorno no trae localStorage: uno mínimo en memoria.
function crearStorage() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", crearStorage());
  visitar("/");
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("datosDeLaVisita", () => {
  it("toma utm, fbclid, gclid, el referrer externo y la página de entrada", () => {
    visitar("/modelos?utm_source=facebook&utm_medium=paid&utm_campaign=otono&fbclid=abc&gclid=", "https://l.facebook.com/");
    expect(datosDeLaVisita(AHORA)).toEqual({
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "otono",
      fbclid: "abc",
      referrer: "https://l.facebook.com/",
      landing: "/modelos",
      fecha: "2026-10-26T12:00:00.000Z",
    });
  });

  it("un referrer del propio sitio no cuenta, ni uno inválido", () => {
    visitar("/", `${window.location.origin}/modelos`);
    expect(datosDeLaVisita(AHORA).referrer).toBeUndefined();
    visitar("/", "no-es-url");
    expect(datosDeLaVisita(AHORA).referrer).toBeUndefined();
  });

  it("recorta valores largos", () => {
    visitar(`/?utm_source=${"x".repeat(150)}&utm_campaign=${"y".repeat(250)}&gclid=${"z".repeat(600)}`);
    const d = datosDeLaVisita(AHORA);
    expect(d.utm_source).toHaveLength(100);
    expect(d.utm_campaign).toHaveLength(200);
    expect(d.gclid).toHaveLength(500);
  });
});

describe("capturarOrigen / leerOrigen", () => {
  it("guarda la primera visita y no la pisa en las siguientes", () => {
    visitar("/?utm_source=instagram");
    capturarOrigen(AHORA);
    visitar("/?utm_source=google");
    capturarOrigen(AHORA + 1000);
    expect(leerOrigen(AHORA + 2000)?.utm_source).toBe("instagram");
  });

  it("vence a los 30 días: después la visita nueva cuenta como primera", () => {
    visitar("/?utm_source=instagram");
    capturarOrigen(AHORA);
    expect(leerOrigen(AHORA + DURACION_ORIGEN_MS + 1)).toBeUndefined();
    visitar("/?utm_source=google");
    capturarOrigen(AHORA + DURACION_ORIGEN_MS + 1);
    expect(leerOrigen(AHORA + DURACION_ORIGEN_MS + 2)?.utm_source).toBe("google");
  });

  it("no captura en el panel /admin", () => {
    visitar("/admin/clientes");
    capturarOrigen(AHORA);
    expect(window.localStorage.getItem(CLAVE_ORIGEN)).toBeNull();
  });

  it("un valor guardado roto se ignora", () => {
    window.localStorage.setItem(CLAVE_ORIGEN, "{no es json");
    expect(leerOrigen(AHORA)).toBeUndefined();
    window.localStorage.setItem(CLAVE_ORIGEN, JSON.stringify({ expira: "x" }));
    expect(leerOrigen(AHORA)).toBeUndefined();
  });

  it("sin localStorage disponible no rompe", () => {
    const bloqueado = () => {
      throw new Error("bloqueado");
    };
    vi.stubGlobal("localStorage", { getItem: bloqueado, setItem: bloqueado });
    expect(() => capturarOrigen(AHORA)).not.toThrow();
    expect(leerOrigen(AHORA)).toBeUndefined();
  });

  it("CapturaOrigen lo guarda al montar", () => {
    visitar("/?utm_source=google&utm_medium=cpc");
    render(<CapturaOrigen />);
    expect(leerOrigen()?.utm_medium).toBe("cpc");
  });
});
