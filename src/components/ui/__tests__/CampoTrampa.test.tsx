import { describe, it, expect } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import CampoTrampa, { useCampoTrampa } from "../CampoTrampa";

describe("CampoTrampa", () => {
  it("fuera de la vista, fuera del teclado y del lector de pantalla; vacío no marca nada", () => {
    const { result } = renderHook(() => useCampoTrampa());
    const { container } = render(<CampoTrampa inputRef={result.current.ref} />);
    const input = container.querySelector('input[name="empresa_web"]') as HTMLInputElement;
    expect(input).toHaveAttribute("tabindex", "-1");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveStyle({ position: "absolute", left: "-10000px" });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(result.current.valor()).toEqual({ empresa_web: "" });
  });

  it("lo que llene un bot va en el envío", () => {
    const { result } = renderHook(() => useCampoTrampa());
    const { container } = render(<CampoTrampa inputRef={result.current.ref} />);
    (container.querySelector("input") as HTMLInputElement).value = "spam.com";
    expect(result.current.valor()).toEqual({ empresa_web: "spam.com" });
  });

  it("sin el campo montado, el valor es vacío", () => {
    const { result } = renderHook(() => useCampoTrampa());
    expect(result.current.valor()).toEqual({ empresa_web: "" });
  });
});
