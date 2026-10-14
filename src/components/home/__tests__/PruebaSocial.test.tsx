import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_t, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ children, initial, animate, whileInView, viewport, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) => {
          const Tag = tag as keyof React.JSX.IntrinsicElements;
          return <Tag {...rest}>{children}</Tag>;
        },
    }
  ),
}));

import PruebaSocial from "../PruebaSocial";

describe("PruebaSocial — showroom", () => {
  it("muestra la ciudad del showroom, con el link de Google Maps y el mapa centrado en el punto exacto", () => {
    render(<PruebaSocial />);
    expect(screen.getByText("Sunchales, Santa Fe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el showroom en Google Maps" })).toHaveAttribute(
      "href",
      "https://maps.app.goo.gl/3q8E5RUDq5bGNZLS6"
    );
    expect(screen.getByTitle("Showroom MOVARA — Sunchales, Santa Fe")).toHaveAttribute(
      "src",
      "https://maps.google.com/maps?q=-30.942916,-61.540411&z=17&output=embed"
    );
  });
});
