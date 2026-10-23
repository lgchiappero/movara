import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const { mockPush, mockPathname, mockScrollArriba, mockScrollASeccion } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockPathname: vi.fn(() => "/"),
  mockScrollArriba: vi.fn(),
  mockScrollASeccion: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: mockPathname, useRouter: () => ({ push: mockPush }) }));
vi.mock("@/lib/scroll", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/scroll")>()),
  scrollArriba: mockScrollArriba,
  scrollASeccion: mockScrollASeccion,
}));

import LinkInterno from "@/components/ui/LinkInterno";
import HomeHashScroll from "@/components/home/HomeHashScroll";
import BackToTop, { altoBarraInferior } from "@/components/ui/BackToTop";

// Corta la navegación por defecto de jsdom en los clics que LinkInterno deja
// pasar: si no, queda pendiente y cambia la URL en medio de otro test. Va en
// document, que escucha después que React, así LinkInterno ve el evento sin
// cancelar.
const cortarNavegacion = (e: Event) => e.preventDefault();

beforeEach(() => {
  document.addEventListener("click", cortarNavegacion);
  vi.clearAllMocks();
  mockPathname.mockReturnValue("/");
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  document.removeEventListener("click", cortarNavegacion);
  document.body.innerHTML = "";
});

describe("LinkInterno", () => {
  it("el logo en la home sube al principio y borra el #", () => {
    window.history.replaceState(null, "", "/#proceso");
    const onClick = vi.fn();
    render(<LinkInterno href="/" onClick={onClick}>MOVARA</LinkInterno>);
    fireEvent.click(screen.getByRole("link", { name: "MOVARA" }));
    expect(onClick).toHaveBeenCalled();
    expect(mockScrollArriba).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("el logo en la home sin # sube sin tocar la URL", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    render(<LinkInterno href="/">MOVARA</LinkInterno>);
    fireEvent.click(screen.getByRole("link", { name: "MOVARA" }));
    expect(mockScrollArriba).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
  });

  it("el logo en otra página navega normal a la home", () => {
    mockPathname.mockReturnValue("/modelos");
    render(<LinkInterno href="/">MOVARA</LinkInterno>);
    const link = screen.getByRole("link", { name: "MOVARA" });
    const evento = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(evento);
    expect(mockScrollArriba).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(link).toHaveAttribute("href", "/");
  });

  it("un link a sección en la home baja ahí y deja el # en la URL", () => {
    render(<LinkInterno href="/#proceso">Proceso</LinkInterno>);
    fireEvent.click(screen.getByRole("link", { name: "Proceso" }));
    expect(mockScrollASeccion).toHaveBeenCalledWith("proceso");
    expect(window.location.hash).toBe("#proceso");
  });

  it("un link a sección desde otra página navega sin el scroll de Next", () => {
    mockPathname.mockReturnValue("/nosotros");
    render(<LinkInterno href="/#contacto">Contacto</LinkInterno>);
    fireEvent.click(screen.getByRole("link", { name: "Contacto" }));
    expect(mockPush).toHaveBeenCalledWith("/#contacto", { scroll: false });
    expect(mockScrollASeccion).not.toHaveBeenCalled();
  });

  it("los demás links y los clics con modificador quedan como Link común", () => {
    render(
      <>
        <LinkInterno href="/modelos">Modelos</LinkInterno>
        <LinkInterno href="/#proceso">Proceso</LinkInterno>
      </>
    );
    fireEvent.click(screen.getByRole("link", { name: "Modelos" }));
    fireEvent.click(screen.getByRole("link", { name: "Proceso" }), { ctrlKey: true });
    expect(mockScrollASeccion).not.toHaveBeenCalled();
    expect(mockScrollArriba).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("si el onClick propio cancela el evento, no hace nada más", () => {
    render(<LinkInterno href="/" onClick={(e) => e.preventDefault()}>MOVARA</LinkInterno>);
    fireEvent.click(screen.getByRole("link", { name: "MOVARA" }));
    expect(mockScrollArriba).not.toHaveBeenCalled();
  });
});

describe("HomeHashScroll", () => {
  it("al montar con # baja a esa sección", async () => {
    window.history.replaceState(null, "", "/#contacto");
    render(<HomeHashScroll />);
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
    expect(mockScrollASeccion).toHaveBeenCalledWith("contacto");
  });

  it("sin # no hace nada, y reacciona a hashchange", async () => {
    const { unmount } = render(<HomeHashScroll />);
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
    expect(mockScrollASeccion).not.toHaveBeenCalled();
    window.history.replaceState(null, "", "/#proceso");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(mockScrollASeccion).toHaveBeenCalledWith("proceso");
    unmount();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(mockScrollASeccion).toHaveBeenCalledTimes(1);
  });
});

describe("BackToTop", () => {
  function barra(alto: number) {
    const b = document.createElement("div");
    b.setAttribute("data-barra-inferior", "");
    Object.defineProperty(b, "offsetHeight", { configurable: true, value: alto });
    document.body.appendChild(b);
  }

  it("altoBarraInferior toma la barra visible más alta (las ocultas miden 0)", () => {
    expect(altoBarraInferior()).toBe(0);
    barra(0);
    barra(94);
    barra(69);
    expect(altoBarraInferior()).toBe(94);
  });

  it("aparece al bajar, se ubica 16px arriba de la barra y sube al tocarlo", () => {
    barra(72);
    render(<BackToTop />);
    expect(screen.queryByRole("button", { name: "Volver al inicio" })).toBeNull();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    const boton = screen.getByRole("button", { name: "Volver al inicio" });
    expect(boton).toHaveStyle({ bottom: "88px" });
    fireEvent.click(boton);
    expect(mockScrollArriba).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("sigue el tamaño de las barras con ResizeObserver", () => {
    let avisar = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          avisar = cb;
        }
        observe = observe;
        disconnect = disconnect;
      }
    );
    barra(60);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
    const { unmount } = render(<BackToTop />);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Volver al inicio" })).toHaveStyle({ bottom: "76px" });
    barra(100);
    act(() => avisar());
    expect(screen.getByRole("button", { name: "Volver al inicio" })).toHaveStyle({ bottom: "116px" });
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("recalcula al cambiar el tamaño de la ventana", () => {
    render(<BackToTop />);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
    barra(94);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByRole("button", { name: "Volver al inicio" })).toHaveStyle({ bottom: "110px" });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });
});
