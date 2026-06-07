import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageGallery from "../ImageGallery";
import type { GalleryImage } from "../ImageGallery";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("@/sanity/lib/image", () => ({
  urlFor: (source: unknown) => ({
    width: () => ({ height: () => ({ fit: () => ({ auto: () => ({ url: () => "https://cdn.sanity.io/images/test/production/abc123-800x600.jpg" }) }) }) }),
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const STATIC_IMAGES: GalleryImage[] = [
  { gradient: "from-stone-700 to-stone-900", accent: "#647c57", label: "Vista exterior" },
  { gradient: "from-stone-600 to-stone-800", accent: "#819874", label: "Interior" },
];

const SANITY_IMAGES: GalleryImage[] = [
  {
    asset: { _ref: "image-abc123-800x600-jpg", _type: "reference" },
    label: "Vista exterior desde Sanity",
  },
  {
    asset: { _ref: "image-def456-800x600-jpg", _type: "reference" },
    label: "Interior desde Sanity",
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ImageGallery", () => {
  it("renderiza sin crashes con imágenes estáticas", () => {
    expect(() => render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />)).not.toThrow();
  });

  it("renderiza sin crashes cuando images es null", () => {
    expect(() => render(<ImageGallery images={null} modelName="Familiar 65" />)).not.toThrow();
  });

  it("renderiza sin crashes cuando images es undefined", () => {
    expect(() => render(<ImageGallery images={undefined} modelName="Familiar 65" />)).not.toThrow();
  });

  it("renderiza sin crashes cuando images es un array vacío", () => {
    expect(() => render(<ImageGallery images={[]} modelName="Familiar 65" />)).not.toThrow();
  });

  it("no muestra flechas de navegación con una sola imagen", () => {
    render(<ImageGallery images={[STATIC_IMAGES[0]]} modelName="Familiar 65" />);
    expect(screen.queryByLabelText("Imagen anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Imagen siguiente")).not.toBeInTheDocument();
  });

  it("muestra flechas de navegación con varias imágenes", () => {
    render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);
    expect(screen.getByLabelText("Imagen anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Imagen siguiente")).toBeInTheDocument();
  });

  it("usa <img> con URL de Sanity cuando la imagen tiene asset", () => {
    render(<ImageGallery images={SANITY_IMAGES} modelName="Test" />);
    const imgs = document.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs[0].src).toContain("cdn.sanity.io");
  });

  it("muestra el label de la imagen activa en el overlay principal", () => {
    render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);
    // El label aparece también en thumbnails; buscamos el span del overlay principal (rounded-full)
    const labels = screen.getAllByText("Vista exterior");
    expect(labels.length).toBeGreaterThan(0);
    // El label del overlay tiene clases de pill
    const mainLabel = labels.find((el) =>
      el.className.includes("rounded-full") && el.className.includes("backdrop-blur")
    );
    expect(mainLabel).toBeTruthy();
  });

  it("navega a la siguiente imagen al hacer click en la flecha", async () => {
    const user = userEvent.setup();
    render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);

    // Antes de navegar: label "Vista exterior" en el overlay principal
    const before = screen.getAllByText("Vista exterior");
    const mainBefore = before.find((el) => el.className.includes("backdrop-blur"));
    expect(mainBefore).toBeTruthy();

    await user.click(screen.getByLabelText("Imagen siguiente"));

    // Después: el overlay principal muestra "Interior"
    const afterLabels = screen.getAllByText("Interior");
    const mainAfter = afterLabels.find((el) => el.className.includes("backdrop-blur"));
    expect(mainAfter).toBeTruthy();
  });

  it("navega de vuelta con la flecha anterior", async () => {
    const user = userEvent.setup();
    render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);

    await user.click(screen.getByLabelText("Imagen siguiente"));
    const interiorLabels = screen.getAllByText("Interior");
    expect(interiorLabels.find((el) => el.className.includes("backdrop-blur"))).toBeTruthy();

    await user.click(screen.getByLabelText("Imagen anterior"));
    const exteriorLabels = screen.getAllByText("Vista exterior");
    expect(exteriorLabels.find((el) => el.className.includes("backdrop-blur"))).toBeTruthy();
  });

  it("muestra thumbnails solo cuando hay más de una imagen", () => {
    const { rerender } = render(<ImageGallery images={[STATIC_IMAGES[0]]} modelName="Test" />);
    expect(screen.queryByLabelText("Imagen 2")).not.toBeInTheDocument();

    rerender(<ImageGallery images={STATIC_IMAGES} modelName="Test" />);
    expect(screen.getByLabelText("Interior")).toBeInTheDocument();
  });
});
