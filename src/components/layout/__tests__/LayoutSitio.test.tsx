import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../Navbar", () => ({ default: () => <header>Navbar</header> }));
vi.mock("../Footer", () => ({ default: () => <footer>Footer</footer> }));

import LayoutSitio from "../LayoutSitio";
import SitioLayout from "@/app/(sitio)/layout";
import NotFound, { metadata } from "@/app/not-found";

describe("LayoutSitio", () => {
  it("header, un solo main con el contenido y footer, en ese orden", () => {
    const { container } = render(<LayoutSitio><p>Contenido</p></LayoutSitio>);
    const hijos = [...container.children].map((e) => e.tagName.toLowerCase());
    expect(hijos).toEqual(["header", "main", "footer"]);
    expect(screen.getByRole("main")).toHaveTextContent("Contenido");
  });

  it("app/(sitio)/layout.tsx lo usa", () => {
    render(<SitioLayout><p>Página</p></SitioLayout>);
    expect(screen.getByRole("main")).toHaveTextContent("Página");
    expect(screen.getByText("Navbar")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});

describe("404", () => {
  it("mismo marco, links a la home y a /modelos, fuera de los buscadores", () => {
    render(<NotFound />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByText("Navbar")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("No encontramos esta página");
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Ver modelos" })).toHaveAttribute("href", "/modelos");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
