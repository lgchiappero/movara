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
  it("muestra la dirección real del showroom, con link a Google Maps y el mapa centrado en esa dirección", () => {
    render(<PruebaSocial />);
    expect(screen.getByText("F. Ramella 1640, Sunchales, Santa Fe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el showroom en Google Maps" })).toHaveAttribute(
      "href",
      "https://maps.app.goo.gl/Pv2sDR4CpixoPQpL6"
    );
    expect(screen.getByTitle("Showroom MOVARA — Sunchales, Santa Fe")).toHaveAttribute(
      "src",
      "https://maps.google.com/maps?q=F.%20Ramella%201640%2C%20Sunchales%2C%20Santa%20Fe%2C%20Argentina&z=16&output=embed"
    );
  });
});
