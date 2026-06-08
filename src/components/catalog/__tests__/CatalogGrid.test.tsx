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

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("@/sanity/lib/image", () => ({
  urlFor: () => ({
    width: () => ({ height: () => ({ fit: () => ({ auto: () => ({ url: () => "https://cdn.sanity.io/test.jpg" }) }) }) }),
  }),
}));

const mockOpenWizard = vi.fn();
vi.mock("@/store/wizard", () => ({
  useWizardStore: (selector: (s: { openWizard: typeof mockOpenWizard }) => unknown) =>
    selector({ openWizard: mockOpenWizard }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeModel = (slug: string, size: number): ProductModel => ({
  slug,
  name: slug,
  tagline: "",
  description: "",
  size,
  rooms: 2,
  baths: 1,
  priceUSD: 30000,
  features: [],
  specs: { estructura: "", cubierta: "", cerramiento: "", aislacion: "", instalaciones: "", terminaciones: "", tiempo: "", garantia: "" },
  images: [],
  floorPlanSize: "medium",
});

const MODELS: ProductModel[] = [
  makeModel("compacto-1", 35),
  makeModel("compacto-2", 45),
  makeModel("mediano-1",  65),
  makeModel("grande-1",   95),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CatalogGrid", () => {
  it("muestra todos los modelos por defecto (filtro 'Todos')", () => {
    render(<CatalogGrid models={MODELS} />);
    for (const m of MODELS) {
      expect(screen.getAllByText(m.slug).length).toBeGreaterThan(0);
    }
  });

  it("filtra por superficie 'Hasta 45 m²' al hacer click", async () => {
    const user = userEvent.setup();
    render(<CatalogGrid models={MODELS} />);
    await user.click(screen.getByRole("button", { name: /hasta 45/i }));

    expect(screen.getAllByText("compacto-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("compacto-2").length).toBeGreaterThan(0);
    expect(screen.queryByText("mediano-1")).toBeNull();
    expect(screen.queryByText("grande-1")).toBeNull();
  });

  it("muestra el conteo correcto en el botón 'Todos'", () => {
    render(<CatalogGrid models={MODELS} />);
    const todosBtn = screen.getByRole("button", { name: /^todos/i });
    expect(todosBtn).toHaveTextContent("4");
  });

  it("muestra estado vacío cuando no hay modelos en el rango de superficie", async () => {
    const user = userEvent.setup();
    const models = [makeModel("grande-solo", 100)];
    render(<CatalogGrid models={models} />);
    await user.click(screen.getByRole("button", { name: /hasta 45/i }));
    expect(screen.getByText(/no hay modelos en ese rango/i)).toBeInTheDocument();
  });

  it("muestra 'modelo' en singular cuando solo hay 1 resultado", async () => {
    const user = userEvent.setup();
    const models = [makeModel("grande-solo", 100)];
    render(<CatalogGrid models={models} />);
    await user.click(screen.getByRole("button", { name: /90 m² o más/i }));
    expect(screen.getByText(/1 modelo$/)).toBeInTheDocument();
  });

  it("muestra 'modelos' en plural cuando hay varios resultados", () => {
    render(<CatalogGrid models={MODELS} />);
    expect(screen.getByText(/4 modelos$/)).toBeInTheDocument();
  });
});
