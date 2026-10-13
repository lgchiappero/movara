import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// urlFor necesita el proyecto de Sanity (en CI no hay .env.local).
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= "proyecto";
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= "production";
});

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));

import ModeloCard, { hrefModelo, lineaTamanos, type ModeloCardData } from "../ModeloCard";
import ModelosGrid from "../ModelosGrid";

const IMG = { asset: { _ref: "image-32a39260aa871f40ac99c191aa9dea94cbac1021-1448x1086-png", _type: "reference" } };
const FLEX: ModeloCardData = { _id: "f", nombre: "MOVARA Flex", slug: "movara-flex", tagline: "Se despliega en destino", imagen: IMG, tamanos: [] };
const DUPLEX: ModeloCardData = { _id: "d", nombre: "MOVARA Duplex", slug: "movara-duplex-76m2", tagline: null, imagen: null, tamanos: [76] };

describe("ModeloCard — con imagen", () => {
  it("imagen completa (object-contain) desde Sanity con urlFor, sobre recuadro 4/3 oscuro", () => {
    render(<ModeloCard modelo={FLEX} />);
    const img = screen.getByRole("img", { name: "MOVARA Flex" });
    const src = img.getAttribute("src")!;
    expect(src).toContain("cdn.sanity.io/images/");
    expect(src).toContain("32a39260aa871f40ac99c191aa9dea94cbac1021-1448x1086.png");
    expect(src).toMatch(/w=1200/);
    expect(src).toMatch(/fit=max/);
    expect(src).toMatch(/auto=format/);
    expect(img).toHaveClass("object-contain", "group-hover:scale-[1.03]");
    expect(img).not.toHaveClass("object-cover");
    expect(img.parentElement).toHaveClass("aspect-[4/3]", "bg-[#141414]");
  });

  it("nombre en Playfair, tagline, CTA con flecha y link a la página del Flex", () => {
    render(<ModeloCard modelo={FLEX} ctaLabel="Ver modelo" />);
    expect(screen.getByRole("heading", { level: 3, name: "MOVARA Flex" })).toHaveClass("font-playfair", "text-white");
    expect(screen.getByText("Se despliega en destino")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /MOVARA Flex/ });
    expect(link).toHaveAttribute("href", "/modelos/flex");
    expect(link).toHaveTextContent("Ver modelo→");
    expect(screen.queryByText("Próximamente")).not.toBeInTheDocument();
  });
});

describe("ModeloCard — sin imagen", () => {
  it("recuadro oscuro con el nombre en Playfair, sin íconos ni 'Sin foto'", () => {
    render(<ModeloCard modelo={DUPLEX} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const recuadro = screen.getByTestId("modelo-sin-imagen");
    expect(recuadro).toHaveTextContent("MOVARA Duplex");
    expect(recuadro.querySelector("span")).toHaveClass("font-playfair");
    expect(recuadro.querySelector("svg")).toBeNull();
    expect(screen.queryByText(/sin fotos?/i)).not.toBeInTheDocument();
    expect(recuadro.parentElement).toHaveClass("aspect-[4/3]", "bg-[#141414]");
  });

  it("muestra los tamaños de Sanity y linkea al slug", () => {
    render(<ModeloCard modelo={DUPLEX} />);
    expect(screen.getByText("76 m²")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/modelos/movara-duplex-76m2");
  });
});

describe("ModeloCard — próximamente", () => {
  it("badge, imagen al 60%, sin CTA ni link", () => {
    render(<ModeloCard modelo={{ ...FLEX, proximamente: true }} />);
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveClass("opacity-60");
    expect(screen.getByRole("img")).not.toHaveClass("group-hover:scale-[1.03]");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver modelo")).not.toBeInTheDocument();
    expect(document.querySelector("[data-modelo-card]")!.parentElement).toHaveAttribute("aria-disabled", "true");
  });
});

describe("helpers", () => {
  it("hrefModelo", () => {
    expect(hrefModelo("movara-flex")).toBe("/modelos/flex");
    expect(hrefModelo("otro")).toBe("/modelos/otro");
    expect(hrefModelo(null)).toBe("/modelos");
  });

  it("lineaTamanos: solo números válidos", () => {
    expect(lineaTamanos([18, 38, 77])).toBe("18 · 38 · 77 m²");
    expect(lineaTamanos([null, 0, 76])).toBe("76 m²");
    expect(lineaTamanos([])).toBeNull();
    expect(lineaTamanos(undefined)).toBeNull();
  });

  it("nombre por defecto si falta", () => {
    render(<ModeloCard modelo={{ _id: "x" }} />);
    expect(screen.getByRole("heading", { name: "Modelo MOVARA" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/modelos");
  });
});

describe("ModelosGrid", () => {
  it("una card por modelo, 1 columna en celular y 2 desde tablet", () => {
    render(<ModelosGrid modelos={[FLEX, DUPLEX]} ctaLabel="Ver modelo" />);
    const lista = screen.getByRole("list");
    expect(lista).toHaveClass("grid-cols-1", "md:grid-cols-2", "items-stretch");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(document.querySelectorAll("[data-modelo-card]")).toHaveLength(2);
  });

  it("eagerPrimeras: las dos primeras imágenes sin lazy loading (LCP de /modelos)", () => {
    render(<ModelosGrid modelos={[FLEX, { ...FLEX, _id: "f2" }, { ...FLEX, _id: "f3" }]} eagerPrimeras />);
    expect(screen.getAllByRole("img").map((i) => i.getAttribute("loading"))).toEqual(["eager", "eager", "lazy"]);
  });

  it("sin modelos muestra el aviso", () => {
    render(<ModelosGrid modelos={[]} />);
    expect(screen.getByText(/Estamos actualizando nuestros modelos/)).toBeInTheDocument();
  });
});
