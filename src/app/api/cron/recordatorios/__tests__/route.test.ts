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
  // Corrida de la mañana: 9:30 hora Argentina del 13/10. Las citas del 14/10
  // (10 a 17 hs) están a 24,5–31,5 horas: dentro de la ventana de 12 a 36.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T12:30:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("marca enviado (y cuenta el intento) solo en las citas cuyo email salió; las fallidas suman un intento", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindMany.mockResolvedValue([cita("c1", "ana@example.com"), cita("c2", "rebota@example.com"), cita("c3", "red@example.com")]);
    mockSend
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { name: "validation_error", statusCode: 422, message: "rebota@example.com" } })
      .mockRejectedValueOnce(new TypeError("fetch failed"));

    const res = await GET(req(`Bearer ${SECRETO}`));
    expect(await res.json()).toEqual({ ok: true, total: 3, enviados: 1, fallidos: 2 });
    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { recordatorioEnviado: true, recordatorioIntentos: { increment: 1 }, recordatorioError: null },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c2" },
      data: { recordatorioIntentos: { increment: 1 }, recordatorioError: "validation_error (422)" },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c3" },
      data: { recordatorioIntentos: { increment: 1 }, recordatorioError: "TypeError" },
    });
    expect(log).toHaveBeenCalledWith("[cron/recordatorios] cita=c2 recordatorio no enviado: validation_error (422)");
    expect(log).toHaveBeenCalledWith("[cron/recordatorios] cita=c3 recordatorio no enviado: TypeError");
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/example\.com|Ana|5491155554444/);
    expect(JSON.stringify(mockUpdate.mock.calls)).not.toMatch(/example\.com|Ana|5491155554444/);
    expect(mockSend.mock.calls[0][0]).toMatchObject({ to: "ana@example.com", replyTo: "contacto@movara.com.ar" });
  });

  it("busca confirmadas sin recordatorio, con menos de 2 intentos, de hoy a pasado mañana", async () => {
    await GET(req(`Bearer ${SECRETO}`));
    expect(mockFindMany.mock.calls[0][0].where).toEqual({
      fecha: {
        in: [
          new Date("2026-10-13T00:00:00.000Z"),
          new Date("2026-10-14T00:00:00.000Z"),
          new Date("2026-10-15T00:00:00.000Z"),
        ],
      },
      estado: "confirmada",
      recordatorioEnviado: false,
      recordatorioIntentos: { lt: 2 },
    });
  });

  it("solo intenta las citas que empiezan dentro de 12 a 36 horas", async () => {
    mockSend.mockResolvedValue({ data: { id: "e" }, error: null });
    mockFindMany.mockResolvedValue([
      { ...cita("hoy", "a@example.com"), fecha: new Date("2026-10-13T00:00:00.000Z"), horario: "17:00" }, // 7,5 h
      cita("manana", "b@example.com"), // 24,5 h
      { ...cita("pasado", "c@example.com"), fecha: new Date("2026-10-15T00:00:00.000Z"), horario: "10:00" }, // 48,5 h
    ]);
    expect(await (await GET(req(`Bearer ${SECRETO}`))).json()).toEqual({ ok: true, total: 1, enviados: 1, fallidos: 0 });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].to).toBe("b@example.com");
  });

  it("corrida de la noche: reintenta la que falló a la mañana si faltan más de 12 horas", async () => {
    vi.setSystemTime(new Date("2026-10-14T00:30:00.000Z")); // 21:30 del 13/10 en Argentina
    mockSend.mockResolvedValue({ data: { id: "e" }, error: null });
    mockFindMany.mockResolvedValue([
      { ...cita("diez", "a@example.com"), recordatorioIntentos: 1 }, // 14/10 10:00 → 12,5 h
      { ...cita("nueve", "b@example.com"), horario: "09:00", recordatorioIntentos: 1 }, // 11,5 h: ya no
    ]);
    expect(await (await GET(req(`Bearer ${SECRETO}`))).json()).toMatchObject({ total: 1, enviados: 1 });
    expect(mockSend.mock.calls[0][0].to).toBe("a@example.com");
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
