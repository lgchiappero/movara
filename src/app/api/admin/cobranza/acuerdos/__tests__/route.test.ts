import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUniqueUnidad, mockCreateAcuerdo } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUniqueUnidad: vi.fn(),
  mockCreateAcuerdo: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    unidad: { findUnique: mockFindUniqueUnidad },
    acuerdoPago: { create: mockCreateAcuerdo },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { POST } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/acuerdos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  tipo: "cobro",
  unidadId: "u1",
  contraparte: "Juan García",
  concepto: "venta",
  moneda: "USD",
  totalAcordado: 50000,
  cuotas: [{ descripcion: "Pago único", importe: 50000, vencimiento: null }],
};

describe("POST /api/admin/cobranza/acuerdos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUniqueUnidad.mockResolvedValue({ id: "u1" });
    mockCreateAcuerdo.mockResolvedValue({ id: "a1" });
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("400 con body no-JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/cobranza/acuerdos", {
      method: "POST",
      body: "no-es-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 cuando la validación de Zod falla (falta contraparte)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, contraparte: "" }));
    expect(res.status).toBe(400);
  });

  it("400 cuando el concepto no corresponde al tipo (pago con concepto 'venta')", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, tipo: "pago", concepto: "venta", cuotas: VALID_BODY.cuotas })
    );
    expect(res.status).toBe(400);
  });

  it("400 cuando la suma de cuotas no coincide con el total acordado", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, cuotas: [{ descripcion: "Cuota 1", importe: 100, vencimiento: null }] })
    );
    expect(res.status).toBe(400);
  });

  it("404 si la unidad no existe", async () => {
    mockFindUniqueUnidad.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("201 y crea el acuerdo con sus cuotas anidadas, registradoPor desde la sesión", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ ok: true, id: "a1" });
    expect(mockCreateAcuerdo).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tipo: "cobro",
          unidadId: "u1",
          registradoPor: "admin@movara.com.ar",
          cuotas: { create: [{ descripcion: "Pago único", importe: 50000, vencimiento: null }] },
        }),
      })
    );
  });

  it("acepta múltiples cuotas cuya suma coincide con el total acordado", async () => {
    const res = await POST(
      makeRequest({
        ...VALID_BODY,
        cuotas: [
          { descripcion: "Anticipo 30%", importe: 15000, vencimiento: "2026-01-01" },
          { descripcion: "Saldo 70%", importe: 35000, vencimiento: "2026-02-01" },
        ],
      })
    );
    expect(res.status).toBe(201);
  });
});
