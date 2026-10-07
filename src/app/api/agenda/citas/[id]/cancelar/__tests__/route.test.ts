import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate, mockSend } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockSend: vi.fn().mockResolvedValue({ data: { id: "e1" }, error: null }),
}));

vi.mock("@/lib/db", () => ({ db: { cita: { findUnique: mockFindUnique, update: mockUpdate } } }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

const params = { params: Promise.resolve({ id: "c1" }) };

function req(body: unknown) {
  return new NextRequest("http://localhost/api/agenda/citas/c1/cancelar", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const CITA = {
  id: "c1",
  fecha: new Date("2026-12-01T00:00:00.000Z"),
  horario: "10:00",
  nombre: "Juan",
  email: "Juan@Example.com",
  telefono: "123",
  tipoCliente: "particular",
  razonSocial: null,
  consulta: "",
  estado: "confirmada",
  canceladaPor: null,
  motivoCancelacion: null,
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/agenda/citas/[id]/cancelar", () => {
  it("400 sin email o con email inválido", async () => {
    for (const body of [{}, { email: "no-es-email" }, "no-json"]) {
      const res = await POST(req(body), params);
      expect(res.status).toBe(400);
    }
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("403 si el email no coincide: no cancela ni envía emails", async () => {
    mockFindUnique.mockResolvedValue(CITA);
    const res = await POST(req({ email: "otro@example.com" }), params);
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("cita inexistente da el mismo 403 (no revela qué ids existen)", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(req({ email: "juan@example.com" }), params);
    expect(res.status).toBe(403);
  });

  it("cancela si el email coincide, sin distinguir mayúsculas ni espacios", async () => {
    mockFindUnique.mockResolvedValue(CITA);
    mockUpdate.mockResolvedValue({ ...CITA, estado: "cancelada", canceladaPor: "cliente" });
    const res = await POST(req({ email: "  juan@EXAMPLE.com " }), params);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { estado: "cancelada", canceladaPor: "cliente" },
    });
  });

  it("mantiene las respuestas de visita ya cancelada y ya realizada", async () => {
    mockFindUnique.mockResolvedValue({ ...CITA, estado: "cancelada" });
    expect(await (await POST(req({ email: "juan@example.com" }), params)).json()).toEqual({
      ok: true,
      yaEstabaCancelada: true,
    });
    mockFindUnique.mockResolvedValue({ ...CITA, estado: "completada" });
    expect((await POST(req({ email: "juan@example.com" }), params)).status).toBe(409);
  });

  it("al cancelar avisa por email al cliente y al admin (y tolera fallas de envío)", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.CONTACT_EMAIL = "contacto@movara.com.ar";
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindUnique.mockResolvedValue(CITA);
    mockUpdate.mockResolvedValue({ ...CITA, estado: "cancelada", canceladaPor: "cliente" });
    await POST(req({ email: "juan@example.com" }), params);
    expect(mockSend.mock.calls.map(([a]) => a.to)).toEqual(["Juan@Example.com", "contacto@movara.com.ar"]);

    mockSend.mockClear();
    mockSend.mockRejectedValue(new Error("resend"));
    const res = await POST(req({ email: "juan@example.com" }), params);
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(2);
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL;
  });
});
