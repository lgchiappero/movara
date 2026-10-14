import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// urlFor necesita el proyecto de Sanity (en CI no hay .env.local).
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= "proyecto";
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= "production";
});

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useInView: () => true };
});
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));
vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });

import ModelosHome from "../ModelosHome";

const MODELOS = [
  { _id: "f", nombre: "MOVARA Flex", slug: "movara-flex" },
  { _id: "d", nombre: "MOVARA Duplex", slug: "movara-duplex-76m2", superficie: 76 },
];

describe("ModelosHome", () => {
  it("sección oscura con eyebrow, título en Playfair, las cards y el link al catálogo", () => {
    const { container } = render(<ModelosHome modelos={MODELOS} />);
    expect(container.querySelector("section#modelos")).toHaveClass("bg-[#1A1A1A]");
    expect(screen.getByText("Catálogo")).toHaveClass("uppercase", "text-[#D4B06A]");
    expect(screen.getByRole("heading", { level: 2, name: "Nuestros modelos" })).toHaveClass("font-playfair");
    expect(screen.getByRole("link", { name: /MOVARA Flex/ })).toHaveAttribute("href", "/modelos/flex");
    expect(screen.getByRole("link", { name: /MOVARA Duplex/ })).toHaveAttribute("href", "/modelos/movara-duplex-76m2");
    const catalogo = screen.getByRole("link", { name: "Ver catálogo completo" });
    expect(catalogo).toHaveAttribute("href", "/modelos");
    expect(catalogo.className).toContain("border-[#D4B06A]");
  });

  it("usa los textos de Sanity si están cargados y tolera modelos null", () => {
    render(<ModelosHome modelos={null} content={{ titulo: "Modelos", subtitulo: "Sub", ctaCatalogo: "Todo el catálogo", ctaVerModelo: "Ver" }} />);
    expect(screen.getByRole("heading", { level: 2, name: "Modelos" })).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todo el catálogo" })).toBeInTheDocument();
    expect(screen.getByText(/Estamos actualizando nuestros modelos/)).toBeInTheDocument();
  });
});
