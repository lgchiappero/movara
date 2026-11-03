import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));

import { MaterialImage } from "./MaterialImage";

describe("MaterialImage", () => {
  it("muestra la foto si existe", () => {
    render(<MaterialImage src="/configurador/bano/bano-amoblamiento-01.jpg" alt="Amoblamiento — opción 1" sizes="50vw" />);
    expect(screen.getByRole("img", { name: "Amoblamiento — opción 1" })).toHaveAttribute("src", "/configurador/bano/bano-amoblamiento-01.jpg");
  });

  it("si el archivo no existe muestra el placeholder oscuro con 'Foto próximamente'", () => {
    render(<MaterialImage src="/configurador/bano/bano-amoblamiento-02.jpg" alt="Amoblamiento — opción 2" sizes="50vw" />);
    fireEvent.error(screen.getByRole("img", { name: "Amoblamiento — opción 2" }));
    expect(screen.getByRole("img", { name: "Amoblamiento — opción 2 — foto próximamente" })).toHaveClass("bg-[#2F2F2F]");
    expect(screen.getByText("Foto próximamente")).toBeInTheDocument();
  });

  it("con color propio, si no carga la foto muestra el color", () => {
    const { container } = render(<MaterialImage src="/x.jpg" alt="Nogal" sizes="50vw" fallbackColor="#3d2b1f" fallbackBorder />);
    fireEvent.error(screen.getByRole("img", { name: "Nogal" }));
    expect(screen.queryByText("Foto próximamente")).toBeNull();
    expect(container.firstElementChild).toHaveStyle({ backgroundColor: "#3d2b1f" });
    expect(container.firstElementChild).toHaveClass("border");
  });
});
