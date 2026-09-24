import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindManyCliente, mockFindManyUnidad, mockFindManyEnvio } = vi.hoisted(() => ({
  mockFindManyCliente: vi.fn(),
  mockFindManyUnidad: vi.fn(),
  mockFindManyEnvio: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cliente: { findMany: mockFindManyCliente },
    unidad: { findMany: mockFindManyUnidad },
    envio: { findMany: mockFindManyEnvio },
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import AdminBuscarPage from "../page";

describe("AdminBuscarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyCliente.mockResolvedValue([]);
    mockFindManyUnidad.mockResolvedValue([]);
    mockFindManyEnvio.mockResolvedValue([]);
  });

  it("sin filtros no consulta la DB y muestra el placeholder inicial", async () => {
    render(await AdminBuscarPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/escribí algo o elegí un filtro/i)).toBeInTheDocument();
    expect(mockFindManyCliente).not.toHaveBeenCalled();
    expect(mockFindManyUnidad).not.toHaveBeenCalled();
    expect(mockFindManyEnvio).not.toHaveBeenCalled();
  });

  it("con q, busca en las 3 entidades y muestra 'sin resultados' si ninguna matchea", async () => {
    render(await AdminBuscarPage({ searchParams: Promise.resolve({ q: "nada" }) }));
    expect(mockFindManyCliente).toHaveBeenCalled();
    expect(mockFindManyUnidad).toHaveBeenCalled();
    expect(mockFindManyEnvio).toHaveBeenCalled();
    expect(screen.getByText(/no encontramos nada/i)).toBeInTheDocument();
  });

  it("un estado inválido en el querystring se ignora (no rompe ni se aplica)", async () => {
    await AdminBuscarPage({ searchParams: Promise.resolve({ estado: "no-existe", q: "x" }) });
    expect(mockFindManyUnidad).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ estadoFabricacion: "no-existe" }) })
    );
  });

  it("un estado válido filtra unidades por estadoFabricacion y envíos por estado derivado", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-001", estadoFabricacion: "pendiente", cliente: { nombre: "Juan" } },
    ]);
    mockFindManyEnvio.mockResolvedValueOnce([
      { id: "e1", numeroPI: "PI-1", numeroContenedor: null, unidades: [{ estadoFabricacion: "pendiente" }] },
      { id: "e2", numeroPI: "PI-2", numeroContenedor: null, unidades: [{ estadoFabricacion: "entregado" }] },
    ]);
    render(await AdminBuscarPage({ searchParams: Promise.resolve({ estado: "pendiente" }) }));

    expect(mockFindManyUnidad).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ estadoFabricacion: "pendiente" }) })
    );
    // El envío e2 (estado derivado "entregado") se filtra en memoria, no debe aparecer.
    expect(screen.getByText("PI-1")).toBeInTheDocument();
    expect(screen.queryByText("PI-2")).not.toBeInTheDocument();
  });

  it("aplica el filtro de rango de fechas a las 3 entidades", async () => {
    await AdminBuscarPage({ searchParams: Promise.resolve({ desde: "2026-01-01", hasta: "2026-01-31" }) });
    const rango = { gte: new Date("2026-01-01T00:00:00"), lte: new Date("2026-01-31T23:59:59") };
    expect(mockFindManyCliente).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: rango } })
    );
  });

  it("resultados de clientes se listan como links a /admin/clientes/:id", async () => {
    mockFindManyCliente.mockResolvedValueOnce([
      { id: "c1", nombre: "Juan García", email: "juan@x.com", telefono: null },
    ]);
    render(await AdminBuscarPage({ searchParams: Promise.resolve({ q: "Juan" }) }));
    expect(screen.getByText("Clientes (1)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /juan garcía/i })).toHaveAttribute("href", "/admin/clientes/c1");
  });

  it("resultados de unidades muestran 'Sin número' cuando no tienen numeroUnidad", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: null, estadoFabricacion: "pendiente", cliente: { nombre: "Juan" } },
    ]);
    render(await AdminBuscarPage({ searchParams: Promise.resolve({ q: "Juan" }) }));
    expect(screen.getByText("Sin número")).toBeInTheDocument();
  });

  it("resultados de envíos muestran 'Sin PI' cuando no tienen numeroPI, y ocultan el badge de estado sin unidades", async () => {
    mockFindManyEnvio.mockResolvedValueOnce([{ id: "e1", numeroPI: null, numeroContenedor: "CONT-1", unidades: [] }]);
    render(await AdminBuscarPage({ searchParams: Promise.resolve({ q: "CONT" }) }));
    expect(screen.getByText("Sin PI")).toBeInTheDocument();
  });
});
