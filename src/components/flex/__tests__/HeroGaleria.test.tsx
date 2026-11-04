import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeroGaleria from "../HeroGaleria";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithRef<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Réplica fiel de @sanity/image-url: accede a source.asset._ref de forma
// inmediata, igual que la librería real, para poder reproducir el crash
// original ("Cannot read properties of null (reading '_ref')") si el
// componente le pasara una imagen con asset null.
vi.mock("@/sanity/lib/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  urlImagenCompleta: (img: any) => {
    void img.asset._ref;
    return "https://cdn.sanity.io/test.jpg";
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  urlFor: (source: any) => {
    void source.asset._ref;
    // Builder chainable: cualquier método encadenado (width, height, fit,
    // auto...) devuelve el propio proxy; solo url() termina la cadena.
    const target: Record<string, unknown> = { url: () => "https://cdn.sanity.io/test.jpg" };
    const proxy: Record<string, unknown> = new Proxy(target, {
      get: (t, prop) => (prop in t ? t[prop as string] : () => proxy),
    });
    return proxy;
  },
}));

// Reproduce el bug de Sanity Studio: una referencia rota deja asset en null
// (no undefined), en lugar de un objeto { _ref, _type } válido.
const IMG_CON_ASSET_NULL = { asset: null, label: "Foto rota" } as unknown as {
  asset?: { _ref: string; _type: string };
  label?: string;
};

const IMG_VALIDA = {
  asset: { _ref: "image-abc123-800x600-jpg", _type: "reference" },
  label: "Foto válida",
};

describe("HeroGaleria — seguridad ante referencias de imagen nulas", () => {
  it("no crashea cuando una imagen de la galería tiene asset null", () => {
    expect(() =>
      render(
        <HeroGaleria
          title="MOVARA Flex"
          ctaLabel="Quiero este modelo"
          ctaHref="#"
          images={[IMG_CON_ASSET_NULL]}
        />,
      ),
    ).not.toThrow();
  });

  it("cae al fallback estático cuando todas las imágenes tienen asset null", () => {
    render(
      <HeroGaleria
        title="MOVARA Flex"
        ctaLabel="Quiero este modelo"
        ctaHref="#"
        images={[IMG_CON_ASSET_NULL]}
      />,
    );
    // El fallback usa alt "MOVARA Flex — <descripción>", no la imagen rota.
    expect(screen.getAllByAltText(/MOVARA Flex —/).length).toBeGreaterThan(0);
    expect(screen.queryByAltText("Foto rota")).not.toBeInTheDocument();
  });

  it("filtra las imágenes con asset null pero conserva las válidas", () => {
    render(
      <HeroGaleria
        title="MOVARA Flex"
        ctaLabel="Quiero este modelo"
        ctaHref="#"
        images={[IMG_CON_ASSET_NULL, IMG_VALIDA]}
      />,
    );
    expect(screen.getAllByAltText("Foto válida").length).toBeGreaterThan(0);
  });
});

const IMG_1 = { asset: { _ref: "image-uno-800x600-jpg", _type: "reference" }, label: "Foto uno" };
const IMG_2 = { asset: { _ref: "image-dos-800x600-jpg", _type: "reference" }, label: "Foto dos" };
const IMG_3 = { asset: { _ref: "image-tres-800x600-jpg", _type: "reference" }, label: "Foto tres" };

describe("HeroGaleria — navegación", () => {
  it("muestra el contador '1 / N' y avanza con la flecha derecha", async () => {
    const user = userEvent.setup();
    render(
      <HeroGaleria
        title="MOVARA Flex"
        ctaLabel="Quiero este modelo"
        ctaHref="#"
        images={[IMG_1, IMG_2, IMG_3]}
      />,
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /foto siguiente/i }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("retrocede con la flecha izquierda y da la vuelta desde la primera foto", async () => {
    const user = userEvent.setup();
    render(
      <HeroGaleria
        title="MOVARA Flex"
        ctaLabel="Quiero este modelo"
        ctaHref="#"
        images={[IMG_1, IMG_2, IMG_3]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /foto anterior/i }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("navega con las flechas ArrowRight / ArrowLeft del teclado", async () => {
    const user = userEvent.setup();
    render(
      <HeroGaleria
        title="MOVARA Flex"
        ctaLabel="Quiero este modelo"
        ctaHref="#"
        images={[IMG_1, IMG_2, IMG_3]}
      />,
    );
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("clickear un thumbnail navega directo a esa foto y lo marca activo", async () => {
    const user = userEvent.setup();
    render(
      <HeroGaleria
        title="MOVARA Flex"
        ctaLabel="Quiero este modelo"
        ctaHref="#"
        images={[IMG_1, IMG_2, IMG_3]}
      />,
    );
    const thumb3 = screen.getByRole("button", { name: "Foto tres" });
    await user.click(thumb3);

    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(thumb3).toHaveAttribute("aria-pressed", "true");
  });

  it("no muestra flechas ni contador cuando hay una sola foto", () => {
    render(
      <HeroGaleria
        title="MOVARA Flex"
        ctaLabel="Quiero este modelo"
        ctaHref="#"
        images={[IMG_1]}
      />,
    );
    expect(screen.queryByRole("button", { name: /foto siguiente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /foto anterior/i })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });
});
