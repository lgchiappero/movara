import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockDelete, mockGetAdminUser } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockDelete: vi.fn(),
  mockGetAdminUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { acuerdoPago: { findUnique: mockFindUnique, delete: mockDelete } },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { DELETE } from "../route";
import { NextRequest } from "next/server";

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1", { method: "DELETE" });
}

describe("DELETE /api/admin/cobranza/acuerdos/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(401);
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("404 si el acuerdo no existe", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
  });

  it("400 si tiene pagos registrados", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValueOnce({ id: "a1", _count: { movimientos: 3 } });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("3 pagos registrados");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("400 con singular cuando tiene un solo movimiento", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValueOnce({ id: "a1", _count: { movimientos: 1 } });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1" }) });
    const json = await res.json();
    expect(json.error).toContain("1 pago registrado");
    expect(json.error).not.toContain("movimientos");
  });

  it("elimina y devuelve 200 cuando no tiene movimientos", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValueOnce({ id: "a1", _count: { movimientos: 0 } });
    mockDelete.mockResolvedValueOnce({ id: "a1" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });
});
