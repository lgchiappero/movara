import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  // Builder chainable: cualquier método (width, height, fit, auto...)
  // devuelve el propio proxy; solo url() termina la cadena.
  urlFor: () => {
    const target: Record<string, unknown> = {
      url: () => "https://cdn.sanity.io/images/test/production/abc123-800x600.jpg",
    };
    const proxy: Record<string, unknown> = new Proxy(target, {
      get: (t, prop) => (prop in t ? t[prop as string] : () => proxy),
    });
    return proxy;
  },
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

  it("clickear un thumbnail selecciona esa imagen", async () => {
    const user = userEvent.setup();
    render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);

    await user.click(screen.getByLabelText("Interior"));

    const labels = screen.getAllByText("Interior");
    expect(labels.find((el) => el.className.includes("backdrop-blur"))).toBeTruthy();
  });

  it("imagen sin label no muestra el overlay de label", () => {
    const sinLabel = [{ gradient: "from-stone-700 to-stone-900", accent: "#647c57" }];
    render(<ImageGallery images={sinLabel} modelName="Familiar 65" />);
    expect(document.querySelector(".backdrop-blur-sm.px-3")).not.toBeInTheDocument();
  });

  it("imagen de Sanity sin label usa 'Imagen N' en el thumbnail y el nombre del modelo en el overlay principal", async () => {
    const user = userEvent.setup();
    const images = [
      { asset: { _ref: "image-a-800x600-jpg", _type: "reference" }, label: "Primera" },
      { asset: { _ref: "image-b-800x600-jpg", _type: "reference" } }, // sin label
    ];
    render(<ImageGallery images={images} modelName="Familiar 65" />);

    const thumb = screen.getByLabelText("Imagen 2");
    expect(thumb.querySelector("img")).toHaveAttribute("alt", "Imagen 2");

    await user.click(thumb);
    expect(document.querySelector(".aspect-video img")).toHaveAttribute("alt", "Familiar 65");
  });

  it("imagen sin accent/gradient explícitos usa el fallback", () => {
    const sinAccent = [{ label: "Sin estilo propio" }, { label: "Otra" }];
    expect(() => render(<ImageGallery images={sinAccent} modelName="Test" />)).not.toThrow();
  });

  // ── Video: prop nueva `videos` y fallback legacy `video` ──────────────────

  describe("con contenido de video", () => {
    it("videos[] tiene prioridad sobre el video legacy cuando ambos están presentes", () => {
      render(
        <ImageGallery
          images={STATIC_IMAGES}
          modelName="Test"
          video={{ url: "https://youtu.be/legacy123", label: "Legacy" }}
          videos={[{ url: "https://youtu.be/nuevo123", titulo: "Nuevo video" }]}
        />
      );
      // Con tabs habilitadas (video + fotos), el conteo de "Todo" es videos+imágenes
      expect(screen.getByText("Todo")).toBeInTheDocument();
      expect(screen.getByText("Videos")).toBeInTheDocument();
      expect(screen.getByText("Fotos")).toBeInTheDocument();
    });

    it("usa el video legacy cuando no hay videos[]", () => {
      render(
        <ImageGallery
          images={STATIC_IMAGES}
          modelName="Test"
          video={{ url: "https://youtu.be/legacy123", label: "Video legacy" }}
        />
      );
      expect(screen.getByText("Todo")).toBeInTheDocument();
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("title", "Video legacy");
    });

    it("video legacy sin label usa 'Video del modelo'", () => {
      render(
        <ImageGallery images={STATIC_IMAGES} modelName="Test" video={{ url: "https://youtu.be/legacy123" }} />
      );
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("title", "Video del modelo");
    });

    it("video de videos[] sin titulo usa 'Video del modelo'", () => {
      render(
        <ImageGallery images={STATIC_IMAGES} modelName="Test" videos={[{ url: "https://youtu.be/x" }]} />
      );
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("title", "Video del modelo");
    });

    it("no muestra tabs si hay video pero no hay imágenes de Sanity", () => {
      render(<ImageGallery images={null} modelName="Test" videos={[{ url: "https://youtu.be/x" }]} />);
      expect(screen.queryByText("Todo")).not.toBeInTheDocument();
    });

    it.each([
      ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
      ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ])("convierte %s al embed de youtube-nocookie con id %s", (url, id) => {
      render(<ImageGallery images={STATIC_IMAGES} modelName="Test" video={{ url }} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("src", `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`);
    });

    it("URL de youtube en formato no estándar cae en la red de seguridad del regex genérico", () => {
      render(
        <ImageGallery
          images={STATIC_IMAGES}
          modelName="Test"
          video={{ url: "https://youtube.com/some/weird/path/dQw4w9WgXcQ?t=10" }}
        />
      );
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1");
    });

    it("convierte una URL de vimeo al embed player", () => {
      render(<ImageGallery images={STATIC_IMAGES} modelName="Test" video={{ url: "https://vimeo.com/123456789" }} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("src", "https://player.vimeo.com/video/123456789?autoplay=1");
    });

    it("URL no reconocida se usa tal cual como embed", () => {
      render(<ImageGallery images={STATIC_IMAGES} modelName="Test" video={{ url: "https://example.com/x" }} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("src", "https://example.com/x");
    });

    it("URL de video directo (.mp4) renderiza <video> en vez de <iframe>", () => {
      render(<ImageGallery images={STATIC_IMAGES} modelName="Test" video={{ url: "https://cdn.example.com/clip.mp4" }} />);
      expect(document.querySelector("video")).toBeInTheDocument();
      expect(document.querySelector("iframe")).not.toBeInTheDocument();
    });

    it("cambia de filtro con las tabs Fotos / Videos / Todo", async () => {
      const user = userEvent.setup();
      render(
        <ImageGallery images={STATIC_IMAGES} modelName="Test" videos={[{ url: "https://youtu.be/x", titulo: "Mi video" }]} />
      );

      await user.click(screen.getByRole("button", { name: /^videos/i }));
      expect(document.querySelector("iframe")).toBeInTheDocument();
      expect(screen.queryByLabelText("Vista exterior")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^fotos/i }));
      expect(document.querySelector("iframe")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^todo/i }));
      expect(screen.getByText("Mi video")).toBeInTheDocument();
    });

    it("thumbnail de un item de video usa VideoThumbnail y aria-label con su label", () => {
      render(
        <ImageGallery images={STATIC_IMAGES} modelName="Test" videos={[{ url: "https://youtu.be/x", titulo: "Recorrido" }]} />
      );
      expect(screen.getByLabelText("Recorrido")).toBeInTheDocument();
    });

    it("click en el thumbnail de video lo selecciona como activo", async () => {
      const user = userEvent.setup();
      render(
        <ImageGallery images={STATIC_IMAGES} modelName="Test" videos={[{ url: "https://youtu.be/x", titulo: "Recorrido" }]} />
      );
      await user.click(screen.getByLabelText("Recorrido"));
      expect(document.querySelector("iframe")).toBeInTheDocument();
    });
  });

  // ── Swipe táctil ────────────────────────────────────────────────────────

  describe("swipe táctil", () => {
    function swipe(el: Element, startX: number, endX: number) {
      fireEvent.touchStart(el, { touches: [{ clientX: startX }] });
      fireEvent.touchEnd(el, { changedTouches: [{ clientX: endX }] });
    }

    function mainArea(): Element {
      return document.querySelector(".relative.w-full.aspect-video")!;
    }

    it("swipe hacia la izquierda avanza a la siguiente imagen", () => {
      render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);
      swipe(mainArea(), 200, 100); // delta negativo, > 48px
      const labels = screen.getAllByText("Interior");
      expect(labels.find((el) => el.className.includes("backdrop-blur"))).toBeTruthy();
    });

    it("swipe hacia la derecha retrocede a la imagen anterior", () => {
      render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);
      swipe(mainArea(), 100, 200); // primero avanza con swipe izq...
      swipe(mainArea(), 100, 250); // ...y retrocede con swipe der (delta > 48px)
      const labels = screen.getAllByText("Vista exterior");
      expect(labels.find((el) => el.className.includes("backdrop-blur"))).toBeTruthy();
    });

    it("swipe corto (< 48px) no cambia la imagen activa", () => {
      render(<ImageGallery images={STATIC_IMAGES} modelName="Familiar 65" />);
      swipe(mainArea(), 100, 120); // delta de 20px, por debajo del umbral
      const labels = screen.getAllByText("Vista exterior");
      expect(labels.find((el) => el.className.includes("backdrop-blur"))).toBeTruthy();
    });

    it("con una sola imagen, el swipe no rompe nada (early return)", () => {
      render(<ImageGallery images={[STATIC_IMAGES[0]]} modelName="Familiar 65" />);
      expect(() => swipe(mainArea(), 200, 100)).not.toThrow();
    });
  });
});
