import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const nav = vi.hoisted(() => ({ back: vi.fn(), replace: vi.fn(), pathname: vi.fn(() => "/modelos/duplex") }));
vi.mock("next/navigation", () => ({
  usePathname: nav.pathname,
  useRouter: () => ({ back: nav.back, replace: nav.replace, push: vi.fn() }),
}));

import BotonVolver from "../BotonVolver";
import { registrarRuta, reiniciarHistorial } from "@/lib/navegacion/historial";
import { marcarSalidaProtegida } from "@/lib/navegacion/salida-protegida";

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarHistorial();
  nav.pathname.mockReturnValue("/modelos/duplex");
});
afterEach(() => {
  act(() => marcarSalidaProtegida(null));
  vi.unstubAllGlobals();
});

const boton = () => screen.getByRole("button", { name: "Volver" });

describe("BotonVolver", () => {
  it("con historial interno hace router.back()", () => {
    registrarRuta("/modelos");
    registrarRuta("/modelos/duplex");
    render(<BotonVolver />);
    fireEvent.click(boton());
    expect(nav.back).toHaveBeenCalledTimes(1);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("con historial interno según la Navigation API hace router.back()", () => {
    vi.stubGlobal("navigation", { currentEntry: { index: 2 } });
    render(<BotonVolver />);
    fireEvent.click(boton());
    expect(nav.back).toHaveBeenCalledTimes(1);
  });

  it("entrada directa a un modelo: va al catálogo, sin salir del sitio", () => {
    registrarRuta("/modelos/duplex");
    render(<BotonVolver />);
    fireEvent.click(boton());
    expect(nav.back).not.toHaveBeenCalled();
    expect(nav.replace).toHaveBeenCalledWith("/modelos");
  });

  it.each(["/agendar", "/recibo/abc", "/mi-pedido", "/privacidad", "/terminos", "/cualquier-cosa"])(
    "entrada directa a %s: va a la home",
    (ruta) => {
      nav.pathname.mockReturnValue(ruta);
      vi.stubGlobal("navigation", { currentEntry: { index: 0 } });
      render(<BotonVolver />);
      fireEvent.click(boton());
      expect(nav.replace).toHaveBeenCalledWith("/");
    }
  );

  it("táctil de 44px: min-h-11 y min-w-11", () => {
    render(<BotonVolver />);
    expect(boton().className).toMatch(/min-h-11/);
    expect(boton().className).toMatch(/min-w-11/);
  });

  describe("con datos sin enviar (configurador)", () => {
    beforeEach(() => {
      nav.pathname.mockReturnValue("/configurador");
      act(() => marcarSalidaProtegida("Tenés una configuración sin enviar."));
    });

    it("pide confirmación con un modal propio, no confirm()", () => {
      const confirm = vi.fn();
      vi.stubGlobal("confirm", confirm);
      render(<BotonVolver />);
      fireEvent.click(boton());
      const dialogo = screen.getByRole("alertdialog", { name: "¿Salir sin enviar?" });
      expect(dialogo).toHaveAccessibleDescription("Tenés una configuración sin enviar.");
      expect(confirm).not.toHaveBeenCalled();
      expect(nav.replace).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Seguir acá" })).toHaveFocus();
    });

    it("Salir navega", () => {
      render(<BotonVolver />);
      fireEvent.click(boton());
      fireEvent.click(screen.getByRole("button", { name: "Salir" }));
      expect(nav.replace).toHaveBeenCalledWith("/");
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("Seguir acá, Escape o un clic afuera cancelan", () => {
      const { container } = render(<BotonVolver />);
      fireEvent.click(boton());
      fireEvent.click(screen.getByRole("button", { name: "Seguir acá" }));
      expect(screen.queryByRole("alertdialog")).toBeNull();

      fireEvent.click(boton());
      fireEvent.keyDown(window, { key: "Enter" });
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("alertdialog")).toBeNull();

      fireEvent.click(boton());
      // Un clic adentro del diálogo no lo cierra; en el fondo, sí.
      fireEvent.click(screen.getByRole("alertdialog"));
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("alertdialog").parentElement!);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(container).toBeTruthy();
      expect(nav.replace).not.toHaveBeenCalled();
      expect(nav.back).not.toHaveBeenCalled();
    });
  });
});
