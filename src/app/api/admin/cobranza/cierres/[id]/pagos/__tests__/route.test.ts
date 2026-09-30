import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUniqueCierre, mockFindManyMovimiento } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUniqueCierre: vi.fn(),
  mockFindManyMovimiento: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cierrePeriodo: { findUnique: mockFindUniqueCierre },
    movimiento: { findMany: mockFindManyMovimiento },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { GET } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/cierres/c1/pagos");
}

describe("GET /api/admin/cobranza/cierres/[id]/pagos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUniqueCierre.mockResolvedValue({ id: "c1", mes: 6, anio: 2026 });
    mockFindManyMovimiento.mockResolvedValue([]);
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("404 si el cierre no existe", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
  });

  it("consulta movimientos acotados al rango [desde, hasta) del mes del cierre", async () => {
    await GET(makeRequest(), { params: Promise.resolve({ id: "c1" }) });
    const call = mockFindManyMovimiento.mock.calls[0][0];
    expect(call.where.fecha.gte).toEqual(new Date(2026, 5, 1));
    expect(call.where.fecha.lt).toEqual(new Date(2026, 6, 1));
  });

  it("200 y devuelve los pagos con los datos del acuerdo aplanados", async () => {
    mockFindManyMovimiento.mockResolvedValueOnce([
      {
        id: "m1",
        fecha: new Date("2026-06-10"),
        importe: 500,
        modalidad: "transferencia",
        acuerdo: { tipo: "cobro", concepto: "venta", moneda: "USD", contraparte: "Juan", unidad: { numeroUnidad: "MOV-1" } },
      },
    ]);
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pagos).toEqual([
      {
        id: "m1",
        fecha: "2026-06-10T00:00:00.000Z",
        unidadNumero: "MOV-1",
        contraparte: "Juan",
        tipo: "cobro",
        concepto: "venta",
        moneda: "USD",
        importe: 500,
        modalidad: "transferencia",
      },
    ]);
  });

  it("ordena los pagos por fecha ascendente", async () => {
    await GET(makeRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(mockFindManyMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { fecha: "asc" } })
    );
  });

  it("lista vacía cuando el mes no tuvo movimientos", async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "c1" }) });
    const json = await res.json();
    expect(json.pagos).toEqual([]);
  });
});
