import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockCreateTipoCambio } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockCreateTipoCambio: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { tipoCambio: { create: mockCreateTipoCambio } },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { POST } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/tipo-cambio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/cobranza/tipo-cambio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockCreateTipoCambio.mockResolvedValue({ id: "tc1" });
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ fecha: "2026-01-01", usdArs: 1000, fuente: "oficial" }));
    expect(res.status).toBe(401);
  });

  it("400 con body no-JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/cobranza/tipo-cambio", {
      method: "POST",
      body: "no-es-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 si falta la fecha", async () => {
    const res = await POST(makeRequest({ fecha: "", usdArs: 1000 }));
    expect(res.status).toBe(400);
  });

  it("400 si la cotización no es positiva", async () => {
    const res = await POST(makeRequest({ fecha: "2026-01-01", usdArs: 0 }));
    expect(res.status).toBe(400);
  });

  it("400 con una fuente fuera del catálogo", async () => {
    const res = await POST(makeRequest({ fecha: "2026-01-01", usdArs: 1000, fuente: "no-existe" }));
    expect(res.status).toBe(400);
  });

  it("201 y crea la cotización con cargadoPor desde la sesión", async () => {
    const res = await POST(makeRequest({ fecha: "2026-01-01", usdArs: 1050.5, fuente: "blue" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ ok: true, id: "tc1" });
    expect(mockCreateTipoCambio).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usdArs: 1050.5, fuente: "blue", cargadoPor: "admin@movara.com.ar" }),
      })
    );
  });

  it("acepta fuente ausente (queda null)", async () => {
    const res = await POST(makeRequest({ fecha: "2026-01-01", usdArs: 1000 }));
    expect(res.status).toBe(201);
    expect(mockCreateTipoCambio).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fuente: null }) })
    );
  });
});
