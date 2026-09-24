import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { cliente: { findMany: mockFindMany } } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/NuevoClienteForm", () => ({ default: () => <div>NuevoClienteForm</div> }));

import AdminClientesPage from "../page";

describe("AdminClientesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay clientes", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminClientesPage());
    expect(screen.getByText(/todavía no hay clientes/i)).toBeInTheDocument();
  });

  it("lista los clientes con fallback '—' para email/teléfono y el conteo de unidades", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "c1", nombre: "Juan García", email: "juan@x.com", telefono: "123", _count: { unidades: 2 } },
      { id: "c2", nombre: "Sin contacto", email: null, telefono: null, _count: { unidades: 0 } },
    ]);
    render(await AdminClientesPage());
    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(2);
    expect(screen.getAllByRole("link", { name: /ver detalle/i })[0]).toHaveAttribute("href", "/admin/clientes/c1");
  });
});
