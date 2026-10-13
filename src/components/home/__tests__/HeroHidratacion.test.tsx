import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));
vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });

import Hero from "../Hero";
import CountUp from "@/components/motion/CountUp";

/** matchMedia de jsdom (no lo trae) con prefers-reduced-motion configurable. */
function stubMatchMedia(reduce: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    get matches() { return reduce; },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => mq));
  return {
    cambiar(valor: boolean) {
      reduce = valor;
      listeners.forEach((fn) => fn());
    },
  };
}

/** Simula SSR + hidratación. El servidor no conoce la preferencia del
 * usuario, así que el HTML se genera con reducir movimiento desactivado; el
 * navegador lo tiene activado (`reduceEnCliente`) al hidratar. */
async function hidratar(ui: React.ReactElement, reduceEnCliente: boolean) {
  const media = stubMatchMedia(false);
  const html = renderToString(ui);
  media.cambiar(reduceEnCliente);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const recuperables = vi.fn();
  let root!: Root;
  await act(async () => {
    root = hydrateRoot(container, ui, { onRecoverableError: recuperables });
  });
  return { container, recuperables, root, media };
}

let consola: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consola = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consola.mockRestore();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
});

const sinErroresDeHidratacion = (recuperables: ReturnType<typeof vi.fn>) => {
  expect(recuperables).not.toHaveBeenCalled();
  expect(consola.mock.calls.flat().join(" ")).not.toMatch(/hydrat/i);
};

describe("Hero con 'reducir movimiento' (Hero.tsx — indicador de scroll)", () => {
  it("hidrata sin errores y después quita la línea animada", async () => {
    const { container, recuperables, root } = await hidratar(<Hero />, true);
    sinErroresDeHidratacion(recuperables);
    expect(container.querySelector("span.bg-gradient-to-b")).toBeNull();
    expect(container.textContent).toContain("Scroll");
    act(() => root.unmount());
  });

  it("sin reducir movimiento la línea animada queda; si el usuario lo activa después, se quita", async () => {
    const { container, recuperables, root, media } = await hidratar(<Hero />, false);
    sinErroresDeHidratacion(recuperables);
    expect(container.querySelector("span.bg-gradient-to-b")).not.toBeNull();
    await act(async () => media.cambiar(true));
    expect(container.querySelector("span.bg-gradient-to-b")).toBeNull();
    act(() => root.unmount());
  });
});

describe("CountUp con 'reducir movimiento'", () => {
  it("hidrata sin errores y muestra el valor final", async () => {
    const { container, recuperables, root } = await hidratar(<CountUp to={12} />, true);
    sinErroresDeHidratacion(recuperables);
    expect(container.textContent).toBe("12");
    act(() => root.unmount());
  });
});

describe("useReducedMotionSeguro sin matchMedia", () => {
  it("navegadores sin matchMedia: false, sin romper", async () => {
    const html = renderToString(<CountUp to={5} />);
    vi.stubGlobal("matchMedia", undefined);
    const container = document.createElement("div");
    container.innerHTML = html;
    const recuperables = vi.fn();
    let root!: Root;
    await act(async () => {
      root = hydrateRoot(container, <CountUp to={5} />, { onRecoverableError: recuperables });
    });
    sinErroresDeHidratacion(recuperables);
    expect(container.querySelector("span")).toHaveAttribute("aria-label", "5");
    act(() => root.unmount());
  });
});
