import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/components/home/Navbar", () => ({ default: () => <nav>Navbar</nav> }));
vi.mock("@/components/home/Footer", () => ({ default: () => <footer>Footer</footer> }));

import PaginaLegal from "../PaginaLegal";
import AvisoPrivacidad from "../AvisoPrivacidad";
import PrivacidadPage, { metadata as metaPrivacidad } from "@/app/privacidad/page";
import TerminosPage, { metadata as metaTerminos } from "@/app/terminos/page";
import type { DocumentoLegal } from "@/lib/legal/campos";

afterEach(() => vi.unstubAllEnvs());

const DOC: DocumentoLegal = {
  titulo: "Doc de prueba",
  actualizado: "8 de octubre de 2026",
  intro: "Intro de [RAZÓN SOCIAL]",
  secciones: [
    { id: "uno", titulo: "1. Uno", bloques: [{ tipo: "p", texto: "Texto" }] },
    { id: "dos", titulo: "2. Dos", bloques: [{ tipo: "lista", items: ["a", "CUIT [CUIT]"] }] },
  ],
};

describe("PaginaLegal", () => {
  it("navbar, título, fecha, índice con anclas a cada sección y footer", () => {
    render(<PaginaLegal doc={DOC} otro={{ href: "/terminos", label: "Términos" }} />);
    expect(screen.getByText("Navbar")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Doc de prueba" })).toBeInTheDocument();
    expect(screen.getByText("Última actualización: 8 de octubre de 2026")).toBeInTheDocument();
    const indice = screen.getByRole("navigation", { name: "Índice" });
    expect(within(indice).getByRole("link", { name: "1. Uno" })).toHaveAttribute("href", "#uno");
    expect(within(indice).getByRole("link", { name: "2. Dos" })).toHaveAttribute("href", "#dos");
    expect(document.getElementById("uno")).toContainElement(screen.getByRole("heading", { name: "1. Uno" }));
    expect(screen.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos");
  });

  it("resalta los [CAMPOS] en desarrollo", () => {
    const { container } = render(<PaginaLegal doc={DOC} otro={{ href: "/x", label: "x" }} />);
    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(["[RAZÓN SOCIAL]", "[CUIT]"]);
  });

  it("en producción no se publica con [CAMPOS]: falla al renderizar", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => render(<PaginaLegal doc={DOC} otro={{ href: "/x", label: "x" }} />)).toThrow("campos sin completar");
  });
});

describe("páginas /privacidad y /terminos", () => {
  it("renderizan su documento y enlazan entre sí", () => {
    const { unmount } = render(<PrivacidadPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidad" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Términos y Condiciones" })).toHaveAttribute("href", "/terminos");
    unmount();
    render(<TerminosPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Términos y Condiciones" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
    expect(metaPrivacidad.title).toBe("Política de Privacidad — MOVARA");
    expect(metaTerminos.title).toBe("Términos y Condiciones — MOVARA");
  });
});

describe("AvisoPrivacidad", () => {
  it("texto por defecto con link a /privacidad", () => {
    render(<AvisoPrivacidad />);
    expect(screen.getByText(/Al enviar aceptás la/)).toHaveClass("text-stone-500");
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });

  it("tono oscuro y acción personalizada", () => {
    render(<AvisoPrivacidad tono="oscuro" accion="Al confirmar la visita" className="text-center" />);
    expect(screen.getByText(/Al confirmar la visita aceptás la/)).toHaveClass("text-stone-400", "text-center");
  });
});
