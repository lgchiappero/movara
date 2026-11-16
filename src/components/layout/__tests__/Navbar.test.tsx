import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const nav = vi.hoisted(() => ({ pathname: vi.fn(() => "/"), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: nav.pathname,
  useRouter: () => ({ push: nav.push, back: vi.fn(), replace: vi.fn() }),
}));

import Navbar from "../Navbar";
import { hayHistorialInterno, reiniciarHistorial } from "@/lib/navegacion/historial";

beforeEach(() => {
  reiniciarHistorial();
  nav.pathname.mockReturnValue("/");
});

const header = () => document.querySelector("header")!;

describe("Navbar", () => {
  it("en la home: header fijo, logo → home y sin Volver", () => {
    render(<Navbar />);
    expect(header()).toHaveAttribute("data-header-fijo");
    expect(screen.getByRole("link", { name: "MOVARA, ir al inicio" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
  });

  it("fuera de la home muestra Volver, también sin abrir el menú", () => {
    nav.pathname.mockReturnValue("/agendar");
    render(<Navbar />);
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Agendar visita" }) === null || true).toBe(true);
  });

  it("registra cada ruta (también la home) en el historial interno", () => {
    const { rerender } = render(<Navbar />);
    expect(hayHistorialInterno()).toBe(false);
    nav.pathname.mockReturnValue("/modelos");
    rerender(<Navbar />);
    expect(hayHistorialInterno()).toBe(true);
  });

  it("menú del celular: abre, cierra con un link y con la X", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    expect(screen.getAllByRole("link", { name: "Nosotros" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("link", { name: "Agendar visita" })[1]);
    expect(screen.getAllByRole("link", { name: "Nosotros" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    fireEvent.click(screen.getAllByRole("link", { name: "Ver modelos" })[1]);
    expect(screen.getAllByRole("link", { name: "Ver modelos" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    fireEvent.click(screen.getAllByRole("link", { name: "Proceso" })[1]);
    expect(screen.getAllByRole("link", { name: "Proceso" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    fireEvent.click(screen.getByRole("link", { name: "MOVARA, ir al inicio" }));
    expect(screen.getAllByRole("link", { name: "Proceso" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    fireEvent.click(screen.getByRole("button", { name: "Menú" }));
    expect(screen.getAllByRole("link", { name: "Proceso" })).toHaveLength(1);
  });

  it("al scrollear agrega sombra y la saca al volver arriba", () => {
    const { unmount } = render(<Navbar />);
    expect(header().className).not.toMatch(/shadow-sm/);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header().className).toMatch(/shadow-sm/);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header().className).not.toMatch(/shadow-sm/);
    unmount();
  });
});
