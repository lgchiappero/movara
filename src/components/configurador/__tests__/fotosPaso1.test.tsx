import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));
vi.mock("@/lib/meta-pixel", () => ({ trackInitiateCheckout: vi.fn(), trackLead: vi.fn(), trackContact: vi.fn() }));

import ConfiguradorMovara from "../ConfiguradorMovara";

const fotos = { "10ft": ["https://cdn.sanity.io/a.jpg", "https://cdn.sanity.io/b.jpg"], "20ft": ["https://cdn.sanity.io/c.jpg"], "40ft": ["https://cdn.sanity.io/d.jpg"] };

describe("Paso 1 — fotos de cada tamaño", () => {
  it("se ven completas (object-contain sobre fondo oscuro), también las miniaturas", () => {
    render(<ConfiguradorMovara modeloImagenes={fotos} />);
    const principal = screen.getAllByRole("img", { name: "Foto 1 de 2" })[0];
    expect(principal).toHaveClass("object-contain");
    expect(principal).not.toHaveClass("object-cover");
    expect(principal.closest("div")).toHaveClass("bg-[#1A1A1A]");
    const miniatura = screen.getByRole("button", { name: "Ver foto 2" }).querySelector("img")!;
    expect(miniatura).toHaveClass("object-contain");
  });

  it("tocar la foto la abre a pantalla completa sin elegir el modelo; Escape la cierra", () => {
    render(<ConfiguradorMovara modeloImagenes={fotos} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Ampliar foto 1 de 2" })[0]);
    const dialogo = screen.getByRole("dialog", { name: "Foto ampliada: Foto 1 de 2" });
    expect(within(dialogo).getByRole("img")).toHaveAttribute("src", "https://cdn.sanity.io/a.jpg");
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
