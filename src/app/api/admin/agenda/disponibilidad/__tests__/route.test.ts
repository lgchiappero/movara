import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpsert } = vi.hoisted(() => ({ mockUpsert: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { disponibilidadAgenda: { upsert: mockUpsert } } }));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/agenda/disponibilidad", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/admin/agenda/disponibilidad", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hace upsert del día y devuelve 200", async () => {
    mockUpsert.mockResolvedValueOnce({ id: "d1" });
    const res = await POST(makeRequest({ fecha: "2026-10-05", habilitada: true, horarios: ["10:00", "11:00"] }));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { fecha: new Date(Date.UTC(2026, 9, 5)) },
      update: { habilitada: true, horarios: ["10:00", "11:00"] },
      create: { fecha: new Date(Date.UTC(2026, 9, 5)), habilitada: true, horarios: ["10:00", "11:00"] },
    });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/agenda/disponibilidad", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 si la fecha tiene formato inválido", async () => {
    const res = await POST(makeRequest({ fecha: "05-10-2026", habilitada: true, horarios: [] }));
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("400 si trae un horario fuera del catálogo", async () => {
    const res = await POST(makeRequest({ fecha: "2026-10-05", habilitada: true, horarios: ["03:00"] }));
    expect(res.status).toBe(400);
  });
});
