import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { lead: { findMany: mockFindMany } } }));
vi.mock("@/components/admin/MarcarContactadoButton", () => ({
  default: ({ contactado }: { contactado: boolean }) => <div>Contactado: {String(contactado)}</div>,
}));

import AdminLeadsPage from "../page";

const LEAD = {
  id: "l1",
  nombre: "Juan",
  apellido: "García",
  email: "juan@x.com",
  telefono: "123",
  provincia: "Córdoba",
  mensaje: "Hola",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  contactado: false,
};

describe("AdminLeadsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío sin leads", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminLeadsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/no hay leads que coincidan/i)).toBeInTheDocument();
  });

  it("no muestra 'Limpiar' cuando no hay filtros activos", async () => {
    mockFindMany.mockResolvedValueOnce([LEAD]);
    render(await AdminLeadsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText("Limpiar")).not.toBeInTheDocument();
  });

  it("muestra 'Limpiar' cuando hay algún filtro activo", async () => {
    mockFindMany.mockResolvedValueOnce([LEAD]);
    render(await AdminLeadsPage({ searchParams: Promise.resolve({ provincia: "Córdoba" }) }));
    expect(screen.getByText("Limpiar")).toBeInTheDocument();
  });

  it("aplica el filtro de rango de fechas al where", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await AdminLeadsPage({ searchParams: Promise.resolve({ desde: "2026-01-01", hasta: "2026-01-31" }) });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: new Date("2026-01-01T00:00:00"), lte: new Date("2026-01-31T23:59:59") } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("aplica el filtro de provincia (contains insensitive)", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await AdminLeadsPage({ searchParams: Promise.resolve({ provincia: "Cordoba" }) });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { provincia: { contains: "Cordoba", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("sinResponder=1 agrega contactado:false y createdAt.lte a 48hs atrás", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const before = Date.now() - 48 * 60 * 60 * 1000;
    await AdminLeadsPage({ searchParams: Promise.resolve({ sinResponder: "1" }) });
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.contactado).toBe(false);
    expect(where.createdAt.lte.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("sinResponder combinado con 'desde' conserva el gte y agrega el lte de 48hs", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await AdminLeadsPage({ searchParams: Promise.resolve({ desde: "2026-01-01", sinResponder: "1" }) });
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.createdAt.gte).toEqual(new Date("2026-01-01T00:00:00"));
    expect(where.createdAt.lte).toBeInstanceOf(Date);
  });

  it("renderiza nombre completo, fallback '—' y pasa 'contactado' al botón", async () => {
    mockFindMany.mockResolvedValueOnce([LEAD, { ...LEAD, id: "l2", email: null, provincia: null, mensaje: null, apellido: null }]);
    render(await AdminLeadsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/Juan García/)).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contactado: false").length).toBe(2);
  });

  it("el link de exportar CSV incluye los filtros activos como query params", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(
      await AdminLeadsPage({
        searchParams: Promise.resolve({ desde: "2026-01-01", hasta: "2026-01-31", provincia: "Córdoba" }),
      })
    );
    const link = screen.getByRole("link", { name: /exportar csv/i });
    expect(link).toHaveAttribute(
      "href",
      "/api/admin/leads/export?desde=2026-01-01&hasta=2026-01-31&provincia=C%C3%B3rdoba"
    );
  });
});
