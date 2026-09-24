import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelCard from "../ModelCard";
import type { ProductModel } from "@/data/models";

// ── Mocks ────────────────────────────────────────────────────────────────────

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
  // Builder chainable: cualquier método (width, height, fit, auto...)
  // devuelve el propio proxy; solo url() termina la cadena.
  urlFor: () => {
    const target: Record<string, unknown> = { url: () => "https://cdn.sanity.io/test.jpg" };
    const proxy: Record<string, unknown> = new Proxy(target, {
      get: (t, prop) => (prop in t ? t[prop as string] : () => proxy),
    });
    return proxy;
  },
}));

const mockOpenWizard = vi.fn();
vi.mock("@/store/wizard", () => ({
  useWizardStore: (selector: (s: { openWizard: typeof mockOpenWizard }) => unknown) =>
    selector({ openWizard: mockOpenWizard }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FULL_MODEL: ProductModel = {
  slug: "familiar-65",
  name: "Familiar 65",
  tagline: "El punto de partida ideal para tu familia",
  description: "Descripción de prueba",
  size: 65,
  rooms: 3,
  baths: 2,
  tag: "Más elegido",
  features: ["Feature 1", "Feature 2"],
  specs: {
    estructura: "Steel frame",
    cubierta: "Chapa",
    cerramiento: "Panel SIP",
    aislacion: "Lana de roca",
    instalaciones: "Eléctrica y sanitaria",
    terminaciones: "Piso vinílico",
    tiempo: "60–90 días",
    garantia: "5 años",
  },
  images: [
    { gradient: "from-stone-700 to-stone-900", label: "Vista exterior", accent: "#647c57" },
  ],
  floorPlanSize: "medium",
};

// Simula un modelo que viene de Sanity sin todos los campos
const PARTIAL_MODEL = {
  slug: "familiar-65",
  name: "Familiar 65",
} as unknown as ProductModel;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ModelCard", () => {
  beforeEach(() => {
    mockOpenWizard.mockClear();
  });

  it("renderiza sin crashes con datos completos", () => {
    const { container } = render(<ModelCard model={FULL_MODEL} />);
    expect(container).toBeTruthy();
    expect(screen.getByText("Familiar 65")).toBeInTheDocument();
    expect(screen.getByText("Más elegido")).toBeInTheDocument();
  });

  it("muestra 'Consultar precio' — no se muestran precios unitarios", () => {
    render(<ModelCard model={FULL_MODEL} />);
    expect(screen.getByText("Consultar precio")).toBeInTheDocument();
  });

  it("no crashea cuando images es undefined", () => {
    const model = { ...FULL_MODEL, images: undefined } as unknown as ProductModel;
    expect(() => render(<ModelCard model={model} />)).not.toThrow();
  });

  it("no crashea cuando images es un array vacío", () => {
    const model = { ...FULL_MODEL, images: [] } as unknown as ProductModel;
    expect(() => render(<ModelCard model={model} />)).not.toThrow();
  });

  it("no crashea cuando el modelo viene parcialmente de Sanity", () => {
    expect(() => render(<ModelCard model={PARTIAL_MODEL} />)).not.toThrow();
  });

  it("usa gradiente de fallback por categoría cuando no hay imagen", () => {
    const model = { ...FULL_MODEL, images: [] } as unknown as ProductModel;
    const { container } = render(<ModelCard model={model} />);
    // El contenedor de imagen debe existir aunque no haya imagen real
    const imageDiv = container.querySelector(".relative.aspect-video");
    expect(imageDiv).toBeTruthy();
  });

  it("abre el wizard al hacer click en 'Me interesa'", async () => {
    const user = userEvent.setup();
    render(<ModelCard model={FULL_MODEL} />);
    await user.click(screen.getByRole("button", { name: /me interesa/i }));
    expect(mockOpenWizard).toHaveBeenCalledWith({
      slug: "familiar-65",
      name: "Familiar 65",
    });
  });

  it("muestra enlace 'Ver detalles' apuntando al slug correcto", () => {
    render(<ModelCard model={FULL_MODEL} />);
    const link = screen.getByRole("link", { name: /ver detalles/i });
    expect(link).toHaveAttribute("href", "/modelos/familiar-65");
  });

  it("modelo 'próximamente' muestra el badge y el mensaje, sin CTAs ni tag", () => {
    const model = { ...FULL_MODEL, proximamente: true };
    render(<ModelCard model={model} />);
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(screen.getByText("Estamos trabajando en este modelo.")).toBeInTheDocument();
    expect(screen.queryByText("Más elegido")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver detalles/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /me interesa/i })).not.toBeInTheDocument();
  });

  it("usa <img> de Sanity (no CameraPlaceholder) cuando la imagen trae asset", () => {
    const model = {
      ...FULL_MODEL,
      images: [{ asset: { _ref: "image-abc-800x600-jpg", _type: "reference" }, label: "Fachada" }],
    } as unknown as ProductModel;
    render(<ModelCard model={model} />);
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute("src", "https://cdn.sanity.io/test.jpg");
    expect(img).toHaveAttribute("alt", "Fachada");
  });

  it("imagen de Sanity sin label usa el nombre del modelo como alt", () => {
    const model = {
      ...FULL_MODEL,
      images: [{ asset: { _ref: "image-abc-800x600-jpg", _type: "reference" } }],
    } as unknown as ProductModel;
    render(<ModelCard model={model} />);
    expect(document.querySelector("img")).toHaveAttribute("alt", "Familiar 65");
  });

  it("modelo próximamente con imagen de Sanity aplica la clase de opacidad, no la de hover-scale", () => {
    const model = {
      ...FULL_MODEL,
      proximamente: true,
      images: [{ asset: { _ref: "image-abc-800x600-jpg", _type: "reference" }, label: "Fachada" }],
    } as unknown as ProductModel;
    render(<ModelCard model={model} />);
    const img = document.querySelector("img")!;
    expect(img.className).toContain("opacity-60");
    expect(img.className).not.toContain("group-hover:scale-105");
  });

  it("muestra 'ambiente' en singular con 1 habitación y 'baño' en singular con 1 baño", () => {
    const model = { ...FULL_MODEL, rooms: 1, baths: 1 };
    render(<ModelCard model={model} />);
    expect(screen.getByText("1 ambiente")).toBeInTheDocument();
    expect(screen.getByText("1 baño")).toBeInTheDocument();
  });

  it("muestra el badge de Video cuando model.video.url está presente", () => {
    const model = { ...FULL_MODEL, video: { url: "https://youtu.be/abc123" } };
    render(<ModelCard model={model} />);
    expect(screen.getByText("Video")).toBeInTheDocument();
  });

  it("muestra el badge de Video cuando model.videos trae al menos un elemento", () => {
    const model = { ...FULL_MODEL, videos: [{ url: "https://youtu.be/abc123" }] };
    render(<ModelCard model={model} />);
    expect(screen.getByText("Video")).toBeInTheDocument();
  });

  it("no muestra el badge de Video cuando videos es un array vacío", () => {
    const model = { ...FULL_MODEL, videos: [] };
    render(<ModelCard model={model} />);
    expect(screen.queryByText("Video")).not.toBeInTheDocument();
  });
});
