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

import { enviarEmail, esEmailDePrueba } from "./enviar";

const EMAIL = {
  to: "ana@movara.test",
  subject: "Asunto",
  html: "<p>hola</p>",
  replyTo: "contacto@movara.com.ar",
  attachments: [{ filename: "r.pdf", content: Buffer.from("%PDF") }],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
});
afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  vi.unstubAllEnvs();
});

describe("esEmailDePrueba", () => {
  it("solo los dominios reservados example.* y nunca en producción", () => {
    expect(esEmailDePrueba("a@example.com")).toBe(true);
    expect(esEmailDePrueba(" a@EXAMPLE.org ")).toBe(true);
    expect(esEmailDePrueba("a@example.net")).toBe(true);
    expect(esEmailDePrueba("a@gmail.com")).toBe(false);
    expect(esEmailDePrueba("a@example.com.ar")).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    expect(esEmailDePrueba("a@example.com")).toBe(false);
  });
});

describe("enviarEmail", () => {
  it("prueba: guarda el email y los adjuntos en la bandeja local, sin Resend", async () => {
    expect(await enviarEmail(EMAIL, { prueba: true })).toEqual({ ok: true });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockMkdir).toHaveBeenCalled();
    const json = mockWriteFile.mock.calls.find(([p]) => String(p).endsWith(".json"))!;
    expect(JSON.parse(json[1])).toMatchObject({ to: "ana@movara.test", subject: "Asunto", adjuntos: [{ filename: "r.pdf", bytes: 4 }] });
  });

  it("prueba sin adjuntos y con error de disco (solo el tipo de error)", async () => {
    expect(await enviarEmail({ ...EMAIL, attachments: undefined }, { prueba: true })).toEqual({ ok: true });
    mockMkdir.mockRejectedValueOnce(Object.assign(new Error("EACCES: /ruta/ana@movara.test"), { code: "EACCES" }));
    expect(await enviarEmail(EMAIL, { prueba: true })).toEqual({ ok: false, error: "outbox: Error (EACCES)" });
  });

  it("envía por Resend con reply-to y adjuntos", async () => {
    process.env.RESEND_FROM_EMAIL = "MOVARA <hola@movara.com.ar>";
    mockSend.mockResolvedValue({ data: { id: "e1" }, error: null });
    expect(await enviarEmail(EMAIL)).toEqual({ ok: true });
    expect(mockSend.mock.calls[0][0]).toMatchObject({
      from: "MOVARA <hola@movara.com.ar>",
      to: "ana@movara.test",
      replyTo: "contacto@movara.com.ar",
      attachments: [{ filename: "r.pdf" }],
    });
  });

  it("sin reply-to ni adjuntos no manda esos campos; from por defecto", async () => {
    mockSend.mockResolvedValue({ data: { id: "e1" }, error: null });
    await enviarEmail({ to: "a@b.com", subject: "s", html: "h" });
    const enviado = mockSend.mock.calls[0][0];
    expect(enviado.from).toBe("MOVARA <onboarding@resend.dev>");
    expect(enviado).not.toHaveProperty("replyTo");
    expect(enviado).not.toHaveProperty("attachments");
  });

  it("lee el { error } de Resend (no lanza) y devuelve solo el tipo, nunca el mensaje", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: "validation_error", statusCode: 422, message: "Invalid `to` field: ana@movara.test" },
    });
    const r = await enviarEmail(EMAIL);
    expect(r).toEqual({ ok: false, error: "validation_error (422)" });
    expect(JSON.stringify(r)).not.toContain("ana@movara.test");

    mockSend.mockResolvedValue({ data: null, error: { name: "application_error", statusCode: null, message: "x" } });
    expect(await enviarEmail(EMAIL)).toEqual({ ok: false, error: "application_error" });

    mockSend.mockResolvedValue({ data: null, error: { name: "", statusCode: null, message: "sin nombre" } });
    expect(await enviarEmail(EMAIL)).toEqual({ ok: false, error: "error" });
  });

  it("error de red: solo el tipo", async () => {
    mockSend.mockRejectedValue(new TypeError("fetch failed to ana@movara.test"));
    expect(await enviarEmail(EMAIL)).toEqual({ ok: false, error: "TypeError" });
  });

  it("sin RESEND_API_KEY no envía", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await enviarEmail(EMAIL)).toEqual({ ok: false, error: "sin_api_key" });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
