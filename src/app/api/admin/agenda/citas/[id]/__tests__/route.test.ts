import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFindUnique, mockUpdate, mockDelete, mockSend, mockGetAdminUser } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockSend: vi.fn().mockResolvedValue({ id: "email1" }),
  mockGetAdminUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { cita: { findUnique: mockFindUnique, update: mockUpdate, delete: mockDelete } },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { PATCH, DELETE } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/agenda/citas/c1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const CITA = {
  id: "c1",
  fecha: new Date("2026-10-01T00:00:00.000Z"),
  horario: "10:00",
  nombre: "Juan",
  email: "juan@x.com",
  telefono: "123",
  tipoCliente: "particular",
  razonSocial: null,
  consulta: "Info",
  canceladaPor: null,
  motivoCancelacion: null,
};

describe("PATCH /api/admin/agenda/citas/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    process.env.CONTACT_EMAIL = "contacto@movara.com.ar";
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL;
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/agenda/citas/c1", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si el body no cumple el schema", async () => {
    const res = await PATCH(makeRequest({ accion: "invalida" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(400);
  });

  it("404 si la cita no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ accion: "completar" }), {
      params: Promise.resolve({ id: "no-existe" }),
    });
    expect(res.status).toBe(404);
  });

  it("completa la cita sin mandar emails", async () => {
    mockFindUnique.mockResolvedValueOnce(CITA);
    mockUpdate.mockResolvedValueOnce({ ...CITA, estado: "completada" });
    const res = await PATCH(makeRequest({ accion: "completar" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "completada" } });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("cancela la cita, guarda el motivo y manda email al cliente y al admin", async () => {
    mockFindUnique.mockResolvedValueOnce(CITA);
    mockUpdate.mockResolvedValueOnce({ ...CITA, estado: "cancelada", canceladaPor: "admin", motivoCancelacion: "Se reagenda" });

    const res = await PATCH(makeRequest({ accion: "cancelar", motivo: "Se reagenda" }), {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { estado: "cancelada", canceladaPor: "admin", motivoCancelacion: "Se reagenda" },
    });
    expect(mockSend).toHaveBeenCalledTimes(2); // cliente + admin (CONTACT_EMAIL seteado)
  });

  it("cancelar sin motivo guarda motivoCancelacion null", async () => {
    mockFindUnique.mockResolvedValueOnce(CITA);
    mockUpdate.mockResolvedValueOnce({ ...CITA, estado: "cancelada", motivoCancelacion: null });
    await PATCH(makeRequest({ accion: "cancelar" }), { params: Promise.resolve({ id: "c1" }) });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { estado: "cancelada", canceladaPor: "admin", motivoCancelacion: null },
    });
  });

  it("no manda el email al admin si CONTACT_EMAIL no está configurado", async () => {
    delete process.env.CONTACT_EMAIL;
    mockFindUnique.mockResolvedValueOnce(CITA);
    mockUpdate.mockResolvedValueOnce({ ...CITA, estado: "cancelada" });
    await PATCH(makeRequest({ accion: "cancelar" }), { params: Promise.resolve({ id: "c1" }) });
    expect(mockSend).toHaveBeenCalledTimes(1); // solo cliente
  });

  it("no manda ningún email si RESEND_API_KEY no está configurado", async () => {
    delete process.env.RESEND_API_KEY;
    mockFindUnique.mockResolvedValueOnce(CITA);
    mockUpdate.mockResolvedValueOnce({ ...CITA, estado: "cancelada" });
    const res = await PATCH(makeRequest({ accion: "cancelar" }), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("registra el error y sigue devolviendo 200 si el envío al cliente falla", async () => {
    mockSend.mockRejectedValueOnce(new Error("resend down"));
    mockFindUnique.mockResolvedValueOnce(CITA);
    mockUpdate.mockResolvedValueOnce({ ...CITA, estado: "cancelada" });
    const res = await PATCH(makeRequest({ accion: "cancelar" }), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
  });

  it("registra el error y sigue devolviendo 200 si el envío al admin falla", async () => {
    mockSend.mockResolvedValueOnce({ id: "ok-cliente" }).mockRejectedValueOnce(new Error("resend down"));
    mockFindUnique.mockResolvedValueOnce(CITA);
    mockUpdate.mockResolvedValueOnce({ ...CITA, estado: "cancelada" });
    const res = await PATCH(makeRequest({ accion: "cancelar" }), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
  });
});

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/agenda/citas/c1", { method: "DELETE" });
}

describe("DELETE /api/admin/agenda/citas/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("404 si la cita no existe", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
  });

  it("400 si la cita está confirmada y es reciente (ni cancelada ni antigua)", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValueOnce({ ...CITA, estado: "confirmada", fecha: new Date() });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(400);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("elimina una cita cancelada aunque sea reciente", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValueOnce({ ...CITA, estado: "cancelada", fecha: new Date() });
    mockDelete.mockResolvedValueOnce({ id: "c1" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("elimina una cita confirmada con más de 30 días de antigüedad", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    const haceCuarentaDias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    mockFindUnique.mockResolvedValueOnce({ ...CITA, estado: "confirmada", fecha: haceCuarentaDias });
    mockDelete.mockResolvedValueOnce({ id: "c1" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
  });
});
