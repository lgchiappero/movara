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

const sp = (v: Record<string, string> = {}) => ({ searchParams: Promise.resolve(v) });

function cliente(c: Record<string, unknown>) {
  return {
    email: null,
    telefono: null,
    estado: "interesado",
    estadoManual: false,
    origenVisita: null,
    campana: null,
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    _count: { unidades: 0, pedidos: 0 },
    ...c,
  };
}

describe("AdminClientesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay clientes", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminClientesPage(sp()));
    expect(screen.getByText(/todavía no hay clientes/i)).toBeInTheDocument();
    expect(screen.queryByText("Limpiar filtros")).toBeNull();
  });

  it("lista con estado, marca manual, origen, pedidos y unidades; primero los pedido iniciado", async () => {
    mockFindMany.mockResolvedValueOnce([
      cliente({ id: "c1", nombre: "Juan García", email: "juan@x.com", telefono: "123", estado: "comprador", _count: { unidades: 2, pedidos: 1 }, updatedAt: new Date("2026-10-20T00:00:00Z") }),
      cliente({ id: "c2", nombre: "Ana Pérez", estado: "pedido_iniciado", estadoManual: true, origenVisita: "meta_ads", campana: "otono" }),
      cliente({ id: "c3", nombre: "Raro", estado: "otro" }),
    ]);
    render(await AdminClientesPage(sp()));
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas[0]).toHaveTextContent("Ana Pérez");
    expect(filas[0]).toHaveTextContent("Pedido iniciado");
    expect(filas[0]).toHaveTextContent("manual");
    expect(filas[0]).toHaveTextContent("Meta Ads");
    expect(filas[0]).toHaveTextContent("otono");
    expect(filas[1]).toHaveTextContent("Juan García");
    expect(filas[1]).toHaveTextContent("Comprador");
    expect(filas[2]).toHaveTextContent("otro");
    expect(screen.getAllByRole("link", { name: /ver detalle/i })[1]).toHaveAttribute("href", "/admin/clientes/c1");
    expect(mockFindMany.mock.calls[0][0].where).toEqual({});
  });

  it("filtra por estado y origen web válidos; ignora valores inválidos", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminClientesPage(sp({ estado: "presupuestado", origenVisita: "google" })));
    expect(mockFindMany.mock.calls[0][0].where).toEqual({ estado: "presupuestado", origenVisita: "google" });
    expect(screen.getByText(/Ningún cliente coincide/)).toBeInTheDocument();
    expect(screen.getByText("Limpiar filtros")).toBeInTheDocument();

    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminClientesPage(sp({ estado: "x", origenVisita: "y" })));
    expect(mockFindMany.mock.calls[1][0].where).toEqual({});
  });

  it("sin searchParams no rompe", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminClientesPage({}));
    expect(mockFindMany).toHaveBeenCalled();
  });
});
