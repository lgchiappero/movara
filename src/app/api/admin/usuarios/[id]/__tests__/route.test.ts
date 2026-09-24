import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate, mockCount } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { adminUser: { findUnique: mockFindUnique, update: mockUpdate, count: mockCount } },
}));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/usuarios/u1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ADMIN_ACTIVO = { id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin", activo: true, ultimoLogin: null };

describe("PATCH /api/admin/usuarios/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("edita nombre/rol y devuelve 200 con el usuario actualizado", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...ADMIN_ACTIVO, rol: "vendedor" });
    mockUpdate.mockResolvedValueOnce({ ...ADMIN_ACTIVO, nombre: "Nuevo Nombre", rol: "vendedor" });

    const res = await PATCH(makeRequest({ nombre: "Nuevo Nombre" }), {
      params: Promise.resolve({ id: "u1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.usuario.nombre).toBe("Nuevo Nombre");
    expect(json.usuario).not.toHaveProperty("password");
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/usuarios/u1", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si el body es inválido", async () => {
    const res = await PATCH(makeRequest({ nombre: "A" }), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("404 si el usuario no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ activo: false }), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
  });

  it("409 al intentar desactivar al último admin activo", async () => {
    mockFindUnique.mockResolvedValueOnce(ADMIN_ACTIVO);
    mockCount.mockResolvedValueOnce(0); // no hay otros admins activos
    const res = await PATCH(makeRequest({ activo: false }), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("409 al intentar bajarle el rol al último admin activo", async () => {
    mockFindUnique.mockResolvedValueOnce(ADMIN_ACTIVO);
    mockCount.mockResolvedValueOnce(0);
    const res = await PATCH(makeRequest({ rol: "vendedor" }), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(409);
  });

  it("permite desactivar a un admin si hay otro admin activo", async () => {
    mockFindUnique.mockResolvedValueOnce(ADMIN_ACTIVO);
    mockCount.mockResolvedValueOnce(1); // hay otro admin activo
    mockUpdate.mockResolvedValueOnce({ ...ADMIN_ACTIVO, activo: false });

    const res = await PATCH(makeRequest({ activo: false }), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("permite desactivar a un vendedor sin chequear el conteo de admins", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...ADMIN_ACTIVO, rol: "vendedor" });
    mockUpdate.mockResolvedValueOnce({ ...ADMIN_ACTIVO, rol: "vendedor", activo: false });

    const res = await PATCH(makeRequest({ activo: false }), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(200);
    expect(mockCount).not.toHaveBeenCalled();
  });
});
