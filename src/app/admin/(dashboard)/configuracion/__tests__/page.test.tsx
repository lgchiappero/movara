import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import AdminConfiguracionPage from "../page";

describe("AdminConfiguracionPage", () => {
  it("renderiza el título y el link a Usuarios", () => {
    render(<AdminConfiguracionPage />);
    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir a usuarios/i })).toHaveAttribute("href", "/admin/usuarios");
  });
});
