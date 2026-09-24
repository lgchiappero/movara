import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { lead: { findMany: mockFindMany } } }));

import { GET } from "../route";
import { NextRequest } from "next/server";

const LEAD = {
  nombre: "Juan",
  apellido: "García",
  email: "juan@x.com",
  telefono: "123",
  provincia: "Córdoba",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  mensaje: "Hola",
};

describe("GET /api/admin/leads/export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve un CSV con content-type y nombre de archivo correctos", async () => {
    mockFindMany.mockResolvedValueOnce([LEAD]);
    const res = await GET(new NextRequest("http://localhost/api/admin/leads/export"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("leads-movara-");
    const body = await res.text();
    expect(body).toContain("Juan García");
  });

  it("aplica el filtro por provincia a la query", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await GET(new NextRequest("http://localhost/api/admin/leads/export?provincia=Cordoba"));
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { provincia: { contains: "Cordoba", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("aplica el filtro por rango de fechas a la query", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await GET(new NextRequest("http://localhost/api/admin/leads/export?desde=2026-01-01&hasta=2026-01-31"));
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: new Date("2026-01-01T00:00:00"), lte: new Date("2026-01-31T23:59:59") },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("sin filtros, el where queda vacío", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await GET(new NextRequest("http://localhost/api/admin/leads/export"));
    expect(mockFindMany).toHaveBeenCalledWith({ where: {}, orderBy: { createdAt: "desc" } });
  });
});
