import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminContenidoPage from "../page";

describe("AdminContenidoPage", () => {
  it("renderiza el título y el iframe de Sanity Studio", () => {
    render(<AdminContenidoPage />);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    expect(screen.getByTitle("Sanity Studio")).toHaveAttribute("src", "/studio");
  });
});
