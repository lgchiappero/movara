import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFindMany, mockUpdate, mockSend } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockSend: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { cita: { findMany: mockFindMany, update: mockUpdate } } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mockSend }; } }));

import { GET } from "../route";
import { NextRequest } from "next/server";

const SECRETO = "s".repeat(64);

function req(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/recordatorios", {
    headers: authorization ? { authorization } : {},
  });
}

function cita(id: string, email: string) {
  return {
    id,
    fecha: new Date("2026-10-14T00:00:00.000Z"),
    horario: "10:00",
    nombre: "Ana Pérez",
    email,
    telefono: "+5491155554444",
    tipoCliente: "particular",
    razonSocial: null,
    consulta: "",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRETO;
  process.env.RESEND_API_KEY = "re_test";
  mockFindMany.mockResolvedValue([]);
});
afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/recordatorios — autorización", () => {
  it("401 si CRON_SECRET no está configurado, aunque mande un header", async () => {
    delete process.env.CRON_SECRET;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer "))).status).toBe(401);
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[cron/recordatorios] CRON_SECRET no configurado — pedido rechazado");
  });

  it("401 sin header o con el secreto incorrecto", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer otro"))).status).toBe(401);
    expect((await GET(req(SECRETO))).status).toBe(401);
    expect((await GET(req(`Bearer ${SECRETO}x`))).status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("200 con Authorization: Bearer <CRON_SECRET> (lo que manda Vercel Cron)", async () => {
    const res = await GET(req(`Bearer ${SECRETO}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, total: 0, enviados: 0, fallidos: 0 });
  });
});

describe("GET /api/cron/recordatorios — envíos", () => {
  it("marca recordatorioEnviado solo en las citas cuyo email salió", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindMany.mockResolvedValue([cita("c1", "ana@example.com"), cita("c2", "rebota@example.com"), cita("c3", "red@example.com")]);
    mockSend
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { name: "validation_error", statusCode: 422, message: "rebota@example.com" } })
      .mockRejectedValueOnce(new TypeError("fetch failed"));

    const res = await GET(req(`Bearer ${SECRETO}`));
    expect(await res.json()).toEqual({ ok: true, total: 3, enviados: 1, fallidos: 2 });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "c1" }, data: { recordatorioEnviado: true } });
    expect(log).toHaveBeenCalledWith("[cron/recordatorios] cita=c2 recordatorio no enviado: validation_error (422)");
    expect(log).toHaveBeenCalledWith("[cron/recordatorios] cita=c3 recordatorio no enviado: TypeError");
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/example\.com|Ana|5491155554444/);
    expect(mockSend.mock.calls[0][0]).toMatchObject({ to: "ana@example.com", replyTo: "contacto@movara.com.ar" });
  });

  it("busca solo citas confirmadas de mañana sin recordatorio", async () => {
    await GET(req(`Bearer ${SECRETO}`));
    expect(mockFindMany.mock.calls[0][0].where).toMatchObject({ estado: "confirmada", recordatorioEnviado: false, fecha: expect.any(Date) });
  });

  it("sin RESEND_API_KEY no envía ni marca nada", async () => {
    delete process.env.RESEND_API_KEY;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFindMany.mockResolvedValue([cita("c1", "ana@example.com")]);
    const res = await GET(req(`Bearer ${SECRETO}`));
    expect(await res.json()).toMatchObject({ total: 1, enviados: 0, fallidos: 1, motivo: "sin RESEND_API_KEY" });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});
