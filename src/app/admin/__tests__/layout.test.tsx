import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminRootLayout from "../layout";

describe("AdminRootLayout", () => {
  it("renderiza sus children sin envolverlos en nada extra", () => {
    render(<AdminRootLayout>{<p>Contenido</p>}</AdminRootLayout>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});
