import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUniqueCierre, mockFindManyMovimiento, mockCreateCierre } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUniqueCierre: vi.fn(),
  mockFindManyMovimiento: vi.fn(),
  mockCreateCierre: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cierrePeriodo: { findUnique: mockFindUniqueCierre, create: mockCreateCierre },
    movimiento: { findMany: mockFindManyMovimiento },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { POST } from "../route";
import { NextRequest } from "next/server";

const ADMIN_SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };
const VENDEDOR_SESSION = { id: "u2", nombre: "Vendedor", email: "vendedor@movara.com.ar", rol: "vendedor" };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/cierres", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Un mes claramente pasado respecto a cualquier fecha real de ejecución de
// este test — enero de 2020 nunca será "el futuro".
const MES_PASADO = { mes: 1, anio: 2020 };

describe("POST /api/admin/cobranza/cierres", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(ADMIN_SESSION);
    mockFindUniqueCierre.mockResolvedValue(null);
    mockFindManyMovimiento.mockResolvedValue([]);
    mockCreateCierre.mockResolvedValue({ id: "c1" });
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(MES_PASADO));
    expect(res.status).toBe(401);
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce(VENDEDOR_SESSION);
    const res = await POST(makeRequest(MES_PASADO));
    expect(res.status).toBe(403);
  });

  it("400 con body no-JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/cobranza/cierres", {
      method: "POST",
      body: "no-es-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 con mes fuera de rango (13)", async () => {
    const res = await POST(makeRequest({ mes: 13, anio: 2026 }));
    expect(res.status).toBe(400);
  });

  it("400 si el mes todavía no terminó", async () => {
    const enUnAnio = new Date();
    enUnAnio.setFullYear(enUnAnio.getFullYear() + 1);
    const res = await POST(makeRequest({ mes: enUnAnio.getMonth() + 1, anio: enUnAnio.getFullYear() }));
    expect(res.status).toBe(400);
    expect(mockCreateCierre).not.toHaveBeenCalled();
  });

  it("409 si el período ya está cerrado", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce({ id: "existente" });
    const res = await POST(makeRequest(MES_PASADO));
    expect(res.status).toBe(409);
    expect(mockCreateCierre).not.toHaveBeenCalled();
  });

  it("calcula los 4 totales por tipo+moneda y el margen USD, y crea el cierre", async () => {
    mockFindManyMovimiento.mockResolvedValueOnce([
      { importe: 1000, acuerdo: { tipo: "cobro", moneda: "USD" } },
      { importe: 500, acuerdo: { tipo: "cobro", moneda: "USD" } },
      { importe: 200000, acuerdo: { tipo: "cobro", moneda: "ARS" } },
      { importe: 300, acuerdo: { tipo: "pago", moneda: "USD" } },
      { importe: 50000, acuerdo: { tipo: "pago", moneda: "ARS" } },
    ]);
    const res = await POST(makeRequest({ ...MES_PASADO, notas: "cierre de prueba" }));
    expect(res.status).toBe(201);
    expect(mockCreateCierre).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mes: 1,
          anio: 2020,
          cerradoPor: "admin@movara.com.ar",
          notas: "cierre de prueba",
          totalCobradoUSD: 1500,
          totalCobradoARS: 200000,
          totalPagadoUSD: 300,
          totalPagadoARS: 50000,
          margenUSD: 1200,
        }),
      })
    );
  });

  it("consulta movimientos acotados al rango [desde, hasta) del mes solicitado", async () => {
    await POST(makeRequest(MES_PASADO));
    const call = mockFindManyMovimiento.mock.calls[0][0];
    expect(call.where.fecha.gte).toEqual(new Date(2020, 0, 1));
    expect(call.where.fecha.lt).toEqual(new Date(2020, 1, 1));
  });

  it("totales en 0 cuando no hubo movimientos en el mes", async () => {
    const res = await POST(makeRequest(MES_PASADO));
    expect(res.status).toBe(201);
    expect(mockCreateCierre).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalCobradoUSD: 0,
          totalCobradoARS: 0,
          totalPagadoUSD: 0,
          totalPagadoARS: 0,
          margenUSD: 0,
        }),
      })
    );
  });
});
