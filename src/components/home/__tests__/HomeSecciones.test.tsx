import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const reduce = vi.fn(() => false);

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useInView: () => true, useReducedMotion: () => reduce() };
});
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, ...rest }: Record<string, unknown>) => <img {...(rest as object)} alt="" />,
}));

import Hero from "../Hero";
import DolorConvencional from "../DolorConvencional";
import ComoFunciona, { STATS } from "../ComoFunciona";

// jsdom no trae IntersectionObserver; los whileInView de framer lo necesitan.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

beforeEach(() => reduce.mockReturnValue(false));

describe("Hero", () => {
  it("CTA primario abre WhatsApp y el secundario lleva a /modelos", () => {
    render(<Hero waNumber="5493410000000" />);
    const wa = screen.getByRole("link", { name: "Hablar con un asesor" });
    expect(wa.getAttribute("href")).toContain("5493410000000");
    expect(wa).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /Ver modelos/ })).toHaveAttribute("href", "/modelos");
  });

  it("título alineado a la izquierda, con contenido del CMS si existe", () => {
    render(<Hero content={{ titulo: "Título CMS", tituloDestacado: "Destacado" }} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Título CMS");
    expect(h1).toHaveClass("text-left");
  });

  it("muestra el scroll indicator animado; con reduced motion queda solo el riel", () => {
    const { container, unmount } = render(<Hero />);
    expect(screen.getByText("Scroll")).toBeInTheDocument();
    expect(container.querySelector("span.bg-gradient-to-b")).not.toBeNull();
    unmount();

    reduce.mockReturnValue(true);
    const { container: c2 } = render(<Hero />);
    expect(c2.querySelector("span.bg-gradient-to-b")).toBeNull();
  });
});

describe("DolorConvencional", () => {
  it("renderiza 6 cards numeradas 01–06 con el separador en Playfair italic", () => {
    render(<DolorConvencional />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(6);
    cards.forEach((card, i) => {
      expect(within(card).getByText(String(i + 1).padStart(2, "0"))).toHaveClass("text-[#D4B06A]");
      expect(card.className).toContain("hover:scale-[1.02]");
    });
    const sep = screen.getByText("MOVARA existe para que esto no te pase a vos.");
    expect(sep).toHaveClass("font-playfair", "italic", "text-[#D4B06A]");
  });

  it("las descripciones se limitan a 2 líneas", () => {
    render(<DolorConvencional />);
    expect(screen.getByText(/Lo que iba a estar en 8 meses/)).toHaveClass("line-clamp-2");
  });

  it("usa los problemas del CMS y repite las variaciones de fondo si hay más de 6", () => {
    const problemas = Array.from({ length: 7 }, (_, i) => ({ titulo: `P${i}`, descripcion: `D${i}` }));
    render(<DolorConvencional content={{ titulo: "T", subtitulo: "S", separador: "Sep", problemas }} />);
    expect(screen.getAllByRole("article")).toHaveLength(7);
    expect(screen.getByText("07")).toBeInTheDocument();
    expect(screen.getByText("Sep")).toBeInTheDocument();
  });

  it("el CTA hace scroll a la sección de nueva categoría", async () => {
    const target = document.createElement("div");
    target.id = "nueva-categoria";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    render(<DolorConvencional />);
    await userEvent.click(screen.getByRole("button", { name: /Así lo resolvemos/ }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    target.remove();
  });
});

describe("ComoFunciona", () => {
  it("muestra los 4 pasos con número, ícono de línea y título", () => {
    render(<ComoFunciona />);
    const pasos = screen.getAllByRole("listitem");
    expect(pasos).toHaveLength(4);
    ["Configurás tu espacio", "Recibís tu presupuesto", "Fabricamos y coordinamos", "Llega listo"].forEach(
      (titulo, i) => {
        expect(within(pasos[i]).getByRole("heading", { name: titulo })).toBeInTheDocument();
        expect(within(pasos[i]).getByText(`0${i + 1}`)).toBeInTheDocument();
        expect(pasos[i].querySelector("svg")).toHaveAttribute("stroke-width", "1.25");
      }
    );
  });

  it("muestra las cifras clave (90 días, 12 meses, 3 tamaños)", async () => {
    render(<ComoFunciona />);
    expect(STATS.map((s) => s.valor)).toEqual([90, 12, 3]);
    for (const s of STATS) {
      expect(screen.getByLabelText(String(s.valor))).toBeInTheDocument();
      expect(screen.getByText(s.unidad)).toBeInTheDocument();
    }
  });

  it("usa los pasos del CMS y recicla los íconos si hay más de 4", () => {
    const pasos = Array.from({ length: 5 }, (_, i) => ({ _key: `k${i}`, titulo: `Paso ${i}`, descripcion: "d" }));
    render(<ComoFunciona content={{ titulo: "Título CMS", pasos }} />);
    expect(screen.getByRole("heading", { name: "Título CMS" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Empezar ahora/ })).toHaveAttribute("href", "/configurador");
  });
});
