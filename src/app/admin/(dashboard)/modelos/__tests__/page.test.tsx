import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminModelosPage from "../page";

describe("AdminModelosPage", () => {
  it("renderiza el título y el iframe apuntando a la estructura de modelos", () => {
    render(<AdminModelosPage />);
    expect(screen.getByText("Modelos")).toBeInTheDocument();
    expect(screen.getByTitle("Modelos — Sanity Studio")).toHaveAttribute("src", "/studio/structure/modelos");
  });
});
