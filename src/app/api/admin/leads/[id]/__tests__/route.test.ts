import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { lead: { update: mockUpdate } },
}));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/leads/lead1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/admin/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca contactado=true y setea contactadoEn", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "lead1", contactado: true });

    const res = await PATCH(makeRequest({ contactado: true }), {
      params: Promise.resolve({ id: "lead1" }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "lead1" },
      data: { contactado: true, contactadoEn: expect.any(Date) },
    });
  });

  it("marca contactado=false y limpia contactadoEn", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "lead1", contactado: false });

    const res = await PATCH(makeRequest({ contactado: false }), {
      params: Promise.resolve({ id: "lead1" }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "lead1" },
      data: { contactado: false, contactadoEn: null },
    });
  });

  it("400 si el body no tiene 'contactado' booleano", async () => {
    const res = await PATCH(makeRequest({ contactado: "si" }), {
      params: Promise.resolve({ id: "lead1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));

    const res = await PATCH(makeRequest({ contactado: true }), {
      params: Promise.resolve({ id: "lead1" }),
    });
    expect(res.status).toBe(500);
  });
});
