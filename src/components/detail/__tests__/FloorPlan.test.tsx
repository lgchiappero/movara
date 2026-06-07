import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import FloorPlan from "../FloorPlan";

describe("FloorPlan", () => {
  const SIZES = ["small", "medium", "large", "xl"] as const;

  for (const size of SIZES) {
    it(`renderiza sin crashes para size="${size}"`, () => {
      expect(() => render(<FloorPlan size={size} />)).not.toThrow();
    });
  }

  it("renderiza un SVG", () => {
    const { container } = render(<FloorPlan size="medium" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("incluye la leyenda de Muro, Abertura y Línea de cubierta", () => {
    const { getByText } = render(<FloorPlan size="small" />);
    expect(getByText("Muro")).toBeInTheDocument();
    expect(getByText("Abertura")).toBeInTheDocument();
    expect(getByText(/línea de cubierta/i)).toBeInTheDocument();
  });
});
