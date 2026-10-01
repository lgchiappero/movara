import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate, mockDelete, mockCountConfig, mockGetAdminUser } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockCountConfig: vi.fn(),
  mockGetAdminUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { lead: { update: mockUpdate, delete: mockDelete }, configuracionPedido: { count: mockCountConfig } },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { PATCH, DELETE } from "../route";
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

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/leads/lead1", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "lead1" }) });
    expect(res.status).toBe(400);
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

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/leads/lead1", { method: "DELETE" });
}

describe("DELETE /api/admin/leads/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "lead1" }) });
    expect(res.status).toBe(401);
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "lead1" }) });
    expect(res.status).toBe(403);
  });

  it("400 si tiene consultas/pedidos asociados", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountConfig.mockResolvedValueOnce(1);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "lead1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("1 consulta asociada");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("elimina y devuelve 200 cuando no tiene consultas asociadas", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountConfig.mockResolvedValueOnce(0);
    mockDelete.mockResolvedValueOnce({ id: "lead1" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "lead1" }) });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "lead1" } });
  });

  it("500 si la DB falla al eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountConfig.mockResolvedValueOnce(0);
    mockDelete.mockRejectedValueOnce(new Error("db down"));
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "lead1" }) });
    expect(res.status).toBe(500);
  });
});
