import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogGrid from "../CatalogGrid";
import type { ProductModel } from "@/data/models";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockOpenWizard = vi.fn();
vi.mock("@/store/wizard", () => ({
  useWizardStore: (selector: (s: { openWizard: typeof mockOpenWizard }) => unknown) =>
    selector({ openWizard: mockOpenWizard }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeModel = (slug: string, category: ProductModel["category"]): ProductModel => ({
  slug,
  name: slug,
  category,
  tagline: "",
  description: "",
  size: 50,
  rooms: 2,
  baths: 1,
  priceUSD: 30000,
  features: [],
  specs: { estructura: "", cubierta: "", cerramiento: "", aislacion: "", instalaciones: "", terminaciones: "", tiempo: "", garantia: "" },
  images: [],
  floorPlanSize: "medium",
});

const MODELS: ProductModel[] = [
  makeModel("familiar-1", "familiar"),
  makeModel("familiar-2", "familiar"),
  makeModel("turistico-1", "turistico"),
  makeModel("oficina-1", "oficina"),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CatalogGrid", () => {
  it("muestra todos los modelos por defecto (filtro 'Todos')", () => {
    render(<CatalogGrid models={MODELS} />);
    for (const m of MODELS) {
      expect(screen.getAllByText(m.slug).length).toBeGreaterThan(0);
    }
  });

  it("filtra por categoría 'familiar' al hacer click", async () => {
    const user = userEvent.setup();
    render(<CatalogGrid models={MODELS} />);
    await user.click(screen.getByRole("button", { name: /vivienda familiar/i }));

    expect(screen.getAllByText("familiar-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("familiar-2").length).toBeGreaterThan(0);
  });

  it("muestra el conteo correcto por categoría", () => {
    render(<CatalogGrid models={MODELS} />);
    // El botón "Todos" muestra el total
    const todosBtn = screen.getByRole("button", { name: /^todos/i });
    expect(todosBtn).toHaveTextContent("4");
  });

  it("muestra estado vacío cuando no hay modelos en la categoría", async () => {
    const user = userEvent.setup();
    const models = [makeModel("oficina-1", "oficina")];
    render(<CatalogGrid models={models} />);
    await user.click(screen.getByRole("button", { name: /vivienda familiar/i }));
    expect(screen.getByText(/no hay modelos en esta categoría/i)).toBeInTheDocument();
  });

  it("muestra 'modelo' en singular cuando solo hay 1 resultado", async () => {
    const user = userEvent.setup();
    const models = [makeModel("turistico-solo", "turistico")];
    render(<CatalogGrid models={models} />);
    await user.click(screen.getByRole("button", { name: /alquiler turístico/i }));
    // "1 modelo" singular — solo visible en sm+, pero el texto existe
    expect(screen.getByText(/1 modelo$/)).toBeInTheDocument();
  });

  it("muestra 'modelos' en plural cuando hay varios resultados", () => {
    render(<CatalogGrid models={MODELS} />);
    expect(screen.getByText(/4 modelos$/)).toBeInTheDocument();
  });
});
