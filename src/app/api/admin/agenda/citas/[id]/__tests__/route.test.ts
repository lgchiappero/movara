import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFindUnique, mockUpdate, mockSend } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockSend: vi.fn().mockResolvedValue({ id: "email1" }),
}));

vi.mock("@/lib/db", () => ({ db: { cita: { findUnique: mockFindUnique, update: mockUpdate } } }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { PATCH } from "../route";
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
