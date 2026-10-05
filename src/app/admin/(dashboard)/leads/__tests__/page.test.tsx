import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindMany, mockCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/lib/db", () => ({ db: { lead: { findMany: mockFindMany, count: mockCount } } }));
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockCount.mockResolvedValue(0);
  });

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
      take: 50,
      skip: 0,
    });
  });

  it("aplica el filtro de provincia (contains insensitive)", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await AdminLeadsPage({ searchParams: Promise.resolve({ provincia: "Cordoba" }) });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { provincia: { contains: "Cordoba", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: 0,
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

  it("pagina de a 50: pasa take/skip correctos y expone Anterior/Siguiente preservando todos los filtros", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(120);
    render(
      await AdminLeadsPage({
        searchParams: Promise.resolve({
          desde: "2026-01-01",
          hasta: "2026-01-31",
          provincia: "Córdoba",
          sinResponder: "1",
          page: "2",
        }),
      })
    );
    const call = mockFindMany.mock.calls[0][0];
    expect(call.take).toBe(50);
    expect(call.skip).toBe(50);
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    const siguiente = screen.getByRole("link", { name: /siguiente/i });
    const href = siguiente.getAttribute("href")!;
    expect(href).toContain("desde=2026-01-01");
    expect(href).toContain("hasta=2026-01-31");
    expect(href).toContain("provincia=C%C3%B3rdoba");
    expect(href).toContain("sinResponder=1");
    expect(href).toContain("page=3");
  });

  it("page inválido (no numérico) cae a la página 1", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await AdminLeadsPage({ searchParams: Promise.resolve({ page: "no-es-numero" }) });
    const call = mockFindMany.mock.calls[0][0];
    expect(call.skip).toBe(0);
  });

  it("con 1 sola página no se muestra ningún control de paginación", async () => {
    mockFindMany.mockResolvedValueOnce([LEAD]);
    render(await AdminLeadsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(/página 1 de/i)).not.toBeInTheDocument();
  });

  it("el link de Exportar CSV incluye 'sin responder' (exporta lo mismo que se ve)", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);
    render(await AdminLeadsPage({ searchParams: Promise.resolve({ sinResponder: "1" }) }));
    expect(screen.getByRole("link", { name: "Exportar CSV" })).toHaveAttribute("href", "/api/admin/leads/export?sinResponder=1");
  });

  it("una fecha inválida en la URL no rompe la página", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);
    render(await AdminLeadsPage({ searchParams: Promise.resolve({ desde: "no-es-fecha" }) }));
    expect(mockFindMany.mock.calls[0][0].where).toEqual({});
  });
});
