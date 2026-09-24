import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTransaction } = vi.hoisted(() => ({ mockTransaction: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mockTransaction,
    disponibilidadAgenda: { upsert: vi.fn() },
  },
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/agenda/disponibilidad/mes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/admin/agenda/disponibilidad/mes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("habilita todos los días hábiles (lunes a sábado) del mes", async () => {
    mockTransaction.mockResolvedValueOnce([]);
    // Octubre 2026 tiene 31 días; contamos cuántos NO son domingo.
    let habiles = 0;
    for (let d = 1; d <= 31; d++) {
      const day = new Date(Date.UTC(2026, 9, d)).getUTCDay();
      if (day !== 0) habiles++;
    }

    const res = await POST(makeRequest({ anio: 2026, mes: 10 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dias).toBe(habiles);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Array));
    expect((mockTransaction.mock.calls[0][0] as unknown[]).length).toBe(habiles);
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/agenda/disponibilidad/mes", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("400 si el mes está fuera de rango", async () => {
    const res = await POST(makeRequest({ anio: 2026, mes: 13 }));
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("400 si el año está fuera de rango", async () => {
    const res = await POST(makeRequest({ anio: 1999, mes: 5 }));
    expect(res.status).toBe(400);
  });
});
