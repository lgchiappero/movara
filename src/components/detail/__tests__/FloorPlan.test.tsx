import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import FloorPlan, { Door } from "../FloorPlan";

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

describe("Door — direcciones no usadas por ningún plano actual", () => {
  it("genera el arco correcto para direction='down'", () => {
    const el = Door({ x: 10, y: 10, direction: "down" });
    expect(el.props.d).toBe("M 10,10 L 10,38 A 28,28 0 0,1 -18,10");
  });

  it("genera el arco correcto para direction='up'", () => {
    const el = Door({ x: 10, y: 10, direction: "up" });
    expect(el.props.d).toBe("M 10,10 L 10,-18 A 28,28 0 0,0 -18,10");
  });

  it("direction='right' (default) sigue funcionando al no pasar el prop", () => {
    const el = Door({ x: 0, y: 0 });
    expect(el.props.d).toBe("M 0,0 L 28,0 A 28,28 0 0,0 0,28");
  });
});
