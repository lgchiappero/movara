import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analizarHref,
  alturaHeader,
  comportamientoScroll,
  scrollArriba,
  scrollASeccion,
  topDeLayout,
  MARGEN_BAJO_HEADER,
} from "@/lib/scroll";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: reduce }));
}

/** jsdom no calcula layout: se fija offsetTop/offsetParent a mano. */
function conLayout(el: HTMLElement, offsetTop: number, offsetParent: HTMLElement | null = null) {
  Object.defineProperty(el, "offsetTop", { configurable: true, value: offsetTop });
  Object.defineProperty(el, "offsetParent", { configurable: true, value: offsetParent });
}

function armarHeader(bottom: number) {
  const header = document.createElement("header");
  header.setAttribute("data-header-fijo", "");
  const nav = document.createElement("nav");
  nav.getBoundingClientRect = () => ({ bottom }) as DOMRect;
  header.appendChild(nav);
  document.body.appendChild(header);
}

let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  mockReducedMotion(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("analizarHref", () => {
  it.each([
    ["/", { tipo: "inicio" }],
    ["/#proceso", { tipo: "seccion", id: "proceso" }],
    ["/#contacto", { tipo: "seccion", id: "contacto" }],
  ])("%s", (href, esperado) => {
    expect(analizarHref(href)).toEqual(esperado);
  });

  it.each(["/modelos", "/nosotros", "#proceso", "/faq#x", "/#", "https://movara.com.ar/#proceso"])(
    "%s no es un destino interno",
    (href) => {
      expect(analizarHref(href)).toBeNull();
    }
  );
});

describe("comportamientoScroll", () => {
  it("suave por defecto", () => {
    expect(comportamientoScroll()).toBe("smooth");
  });

  it("instantáneo con prefers-reduced-motion", () => {
    mockReducedMotion(true);
    expect(comportamientoScroll()).toBe("instant");
  });

  it("sin matchMedia, suave", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(comportamientoScroll()).toBe("smooth");
  });
});

describe("alturaHeader", () => {
  it("mide el borde inferior de la barra del header fijo", () => {
    armarHeader(64);
    expect(alturaHeader()).toBe(64);
  });

  it("sin header, 0", () => {
    expect(alturaHeader()).toBe(0);
  });
});

describe("topDeLayout", () => {
  it("suma offsetTop de toda la cadena de offsetParent", () => {
    const padre = document.createElement("div");
    const hijo = document.createElement("section");
    conLayout(padre, 1000);
    conLayout(hijo, 250, padre);
    expect(topDeLayout(hijo)).toBe(1250);
  });
});

describe("scrollArriba", () => {
  it("sube con scroll suave", () => {
    scrollArriba();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("sin animación con prefers-reduced-motion", () => {
    mockReducedMotion(true);
    scrollArriba();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });
});

describe("scrollASeccion", () => {
  function armarSeccion(id: string, top: number) {
    const s = document.createElement("section");
    s.id = id;
    conLayout(s, top);
    document.body.appendChild(s);
    return s;
  }

  it("baja a la sección descontando el header y el margen", () => {
    armarHeader(64);
    armarSeccion("proceso", 3000);
    expect(scrollASeccion("proceso")).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 3000 - 64 - MARGEN_BAJO_HEADER, behavior: "smooth" });
  });

  it("nunca pide un scroll negativo", () => {
    armarHeader(64);
    armarSeccion("arriba", 10);
    scrollASeccion("arriba");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("si al terminar el scroll la sección se movió, corrige sin animación", () => {
    armarHeader(64);
    const s = armarSeccion("contacto", 5000);
    scrollASeccion("contacto");
    conLayout(s, 5200);
    vi.stubGlobal("scrollY", 4920);
    window.dispatchEvent(new Event("scrollend"));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 5200 - 64 - MARGEN_BAJO_HEADER, behavior: "instant" });
  });

  it("si al terminar ya está en su lugar, no vuelve a mover", () => {
    armarHeader(64);
    armarSeccion("contacto", 5000);
    scrollASeccion("contacto");
    vi.stubGlobal("scrollY", 5000 - 64 - MARGEN_BAJO_HEADER);
    window.dispatchEvent(new Event("scrollend"));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("si la persona mueve la página antes de que termine, no la lleva de vuelta", () => {
    armarHeader(64);
    const s = armarSeccion("contacto", 5000);
    scrollASeccion("contacto");
    conLayout(s, 5200);
    window.dispatchEvent(new Event("wheel"));
    window.dispatchEvent(new Event("scrollend"));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("subir al principio cancela la corrección pendiente", () => {
    armarHeader(64);
    const s = armarSeccion("proceso", 3000);
    scrollASeccion("proceso");
    conLayout(s, 3300);
    scrollArriba();
    vi.stubGlobal("scrollY", 0);
    window.dispatchEvent(new Event("scrollend"));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it("con un id que no existe no hace nada", () => {
    expect(scrollASeccion("no-existe")).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
