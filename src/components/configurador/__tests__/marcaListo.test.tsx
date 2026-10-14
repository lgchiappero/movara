import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));

import ConfiguradorMovara from "../ConfiguradorMovara";

// Los e2e esperan data-configurador="listo" antes de hacer clic: en el HTML del
// servidor tiene que decir "cargando" y pasar a "listo" recién en el cliente.
describe("ConfiguradorMovara — marca de hidratación", () => {
  it('el HTML del servidor sale con data-configurador="cargando"', () => {
    expect(renderToString(<ConfiguradorMovara />)).toContain('data-configurador="cargando"');
  });

  it('en el cliente queda data-configurador="listo"', () => {
    const { container } = render(<ConfiguradorMovara />);
    expect(container.querySelector("main")).toHaveAttribute("data-configurador", "listo");
  });
});
