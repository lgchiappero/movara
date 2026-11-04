import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));

import { SelectorBlock } from "../StepMateriales";
import { MATERIAL_CATEGORY_GROUPS } from "@/data/material-catalog";

const selectores = MATERIAL_CATEGORY_GROUPS.flatMap((g) => g.selectors);
const amoblamiento = selectores.find((s) => s.key === "amoblamientoBano")!;
const paneles = selectores.find((s) => s.key === "panelesBano")!;

function renderSelector(selector = amoblamiento, onSelect = vi.fn()) {
  render(<SelectorBlock selector={selector} selectedId={selector.options[0].id} onSelect={onSelect} priceFor={() => 165} />);
  return onSelect;
}

describe("Fotos verticales del amoblamiento", () => {
  it("las cards muestran la foto completa (3:4, contain) y tienen lupa; los demás selectores no", () => {
    renderSelector();
    const card = screen.getByRole("button", { name: /Amoblamiento — opción 2/ });
    expect(card.querySelector(".aspect-\\[3\\/4\\]")).not.toBeNull();
    expect(within(card).getByRole("img", { name: "Amoblamiento — opción 2" })).toHaveClass("object-contain");
    expect(screen.getAllByRole("button", { name: /Ampliar la foto de la opción/ })).toHaveLength(4);
  });

  it("los paneles siguen recortados (16:10 / 4:3) y sin lupa", () => {
    renderSelector(paneles);
    const card = screen.getAllByRole("button")[0];
    expect(card.querySelector(".aspect-\\[16\\/10\\]")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Ampliar la foto/ })).toBeNull();
  });

  it("la lupa abre la foto a pantalla completa sin elegir la opción; se cierra con el botón, Escape o tocando", () => {
    const onSelect = renderSelector();
    fireEvent.click(screen.getByRole("button", { name: "Ampliar la foto de la opción 4" }));
    const dialogo = screen.getByRole("dialog", { name: "Foto ampliada: Amoblamiento — opción 4" });
    expect(within(dialogo).getByRole("img", { name: "Amoblamiento — opción 4" })).toHaveAttribute("src", "/configurador/bano/bano-amoblamiento-04.jpg");
    expect(onSelect).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Cerrar foto ampliada" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar foto ampliada" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Ampliar la foto de la opción 2" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ampliar la foto de la opción 1" }));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("tocar la card sigue eligiendo la opción", () => {
    const onSelect = renderSelector();
    fireEvent.click(screen.getByRole("button", { name: /Amoblamiento — opción 3/ }));
    expect(onSelect).toHaveBeenCalledWith("amoblamiento-03");
  });
});
