import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindManyConfig, mockFindManyUsers } = vi.hoisted(() => ({
  mockFindManyConfig: vi.fn(),
  mockFindManyUsers: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    configuracionPedido: { findMany: mockFindManyConfig },
    adminUser: { findMany: mockFindManyUsers },
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/NuevoPedidoManualForm", () => ({
  default: ({ vendedores }: { vendedores: { nombre: string }[] }) => <div>Vendedores: {vendedores.length}</div>,
}));

import AdminConfiguracionesPage from "../page";

describe("AdminConfiguracionesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay consultas", async () => {
    mockFindManyConfig.mockResolvedValueOnce([]);
    mockFindManyUsers.mockResolvedValueOnce([]);
    render(await AdminConfiguracionesPage());
    expect(screen.getByText(/todavía no llegó ninguna consulta/i)).toBeInTheDocument();
  });

  it("lista las consultas con estado y modelo, con fallback '—' cuando faltan datos", async () => {
    mockFindManyConfig.mockResolvedValueOnce([
      {
        id: "p1",
        clienteNombre: "Juan García",
        clienteWhatsapp: "+5491112345678",
        modelo: "20ft",
        numeroConsulta: "MOV-CONSULTA-2026-001",
        estadoPedido: "confirmado",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "p2",
        clienteNombre: "Sin datos",
        clienteWhatsapp: null,
        modelo: null,
        numeroConsulta: null,
        estadoPedido: "consulta",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    mockFindManyUsers.mockResolvedValueOnce([{ email: "v@x.com", nombre: "Vendedor 1" }]);

    render(await AdminConfiguracionesPage());

    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("Vendedores: 1")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /ver detalle/i })[0]).toHaveAttribute(
      "href",
      "/admin/configuraciones/p1"
    );
  });

  it("usa el label de estado sin clase conocida como fallback (estado inesperado)", async () => {
    mockFindManyConfig.mockResolvedValueOnce([
      {
        id: "p1",
        clienteNombre: "X",
        clienteWhatsapp: null,
        modelo: null,
        numeroConsulta: null,
        estadoPedido: "estado-raro",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    mockFindManyUsers.mockResolvedValueOnce([]);
    render(await AdminConfiguracionesPage());
    expect(screen.getByText("estado-raro")).toBeInTheDocument();
  });
});
