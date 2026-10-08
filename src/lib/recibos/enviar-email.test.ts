import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSend, mockMkdir, mockWriteFile } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockMkdir: vi.fn().mockResolvedValue(undefined),
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("resend", () => ({ Resend: class { emails = { send: mockSend }; } }));
vi.mock("fs/promises", () => {
  const fs = { mkdir: mockMkdir, writeFile: mockWriteFile, readFile: vi.fn() };
  return { ...fs, default: fs };
});

import { enviarEmailRecibo, esReciboDePrueba } from "./enviar-email";

const EMAIL = { to: "ana@movara.test", subject: "Asunto", html: "<p>hola</p>", attachments: [{ filename: "r.pdf", content: Buffer.from("%PDF") }] };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
});
afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  vi.unstubAllEnvs();
});

describe("esReciboDePrueba", () => {
  it("solo los dominios reservados example.* y nunca en producción", () => {
    expect(esReciboDePrueba("a@example.com")).toBe(true);
    expect(esReciboDePrueba(" a@EXAMPLE.org ")).toBe(true);
    expect(esReciboDePrueba("a@example.net")).toBe(true);
    expect(esReciboDePrueba("a@gmail.com")).toBe(false);
    expect(esReciboDePrueba("a@example.com.ar")).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    expect(esReciboDePrueba("a@example.com")).toBe(false);
  });
});

describe("enviarEmailRecibo", () => {
  it("prueba: guarda el email y los adjuntos en la bandeja local, sin Resend", async () => {
    expect(await enviarEmailRecibo(EMAIL, { prueba: true })).toEqual({ ok: true });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockMkdir).toHaveBeenCalled();
    const json = mockWriteFile.mock.calls.find(([p]) => String(p).endsWith(".json"))!;
    expect(JSON.parse(json[1])).toMatchObject({ to: "ana@movara.test", subject: "Asunto", adjuntos: [{ filename: "r.pdf", bytes: 4 }] });
  });

  it("prueba sin adjuntos y con error de disco", async () => {
    expect(await enviarEmailRecibo({ ...EMAIL, attachments: undefined }, { prueba: true })).toEqual({ ok: true });
    mockMkdir.mockRejectedValueOnce(new Error("EACCES"));
    const r = await enviarEmailRecibo(EMAIL, { prueba: true });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("EACCES") });
  });

  it("envía por Resend con adjuntos y reply-to de contacto", async () => {
    process.env.RESEND_FROM_EMAIL = "MOVARA <hola@movara.com.ar>";
    mockSend.mockResolvedValue({ data: { id: "e1" }, error: null });
    expect(await enviarEmailRecibo(EMAIL, { prueba: false })).toEqual({ ok: true });
    expect(mockSend.mock.calls[0][0]).toMatchObject({
      from: "MOVARA <hola@movara.com.ar>",
      to: "ana@movara.test",
      replyTo: "contacto@movara.com.ar",
      attachments: [{ filename: "r.pdf" }],
    });
  });

  it("revisa el { error } de Resend (no lanza) y los errores de red", async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: "validation_error", message: "dominio no verificado" } });
    expect(await enviarEmailRecibo({ ...EMAIL, attachments: undefined }, { prueba: false })).toEqual({
      ok: false,
      error: "validation_error: dominio no verificado",
    });
    mockSend.mockResolvedValue({ data: null, error: { message: "sin nombre" } });
    expect(await enviarEmailRecibo(EMAIL, { prueba: false })).toEqual({ ok: false, error: "error: sin nombre" });
    mockSend.mockRejectedValue(new Error("ECONNRESET"));
    expect(await enviarEmailRecibo(EMAIL, { prueba: false })).toEqual({ ok: false, error: "ECONNRESET" });
  });

  it("sin RESEND_API_KEY no envía", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await enviarEmailRecibo(EMAIL, { prueba: false })).toEqual({ ok: false, error: "RESEND_API_KEY no configurado" });
  });
});
