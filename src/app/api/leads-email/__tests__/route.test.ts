import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const rl = vi.hoisted(() => ({ consumir: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/rate-limit-db", async (orig) => ({
  ...(await orig<typeof import("@/lib/rate-limit-db")>()),
  consumirRateLimit: rl.consumir,
}));

const { mockExecuteRaw, mockSend } = vi.hoisted(() => ({
  mockExecuteRaw: vi.fn().mockResolvedValue(1),
  mockSend: vi.fn().mockResolvedValue({ data: { id: "e1" }, error: null }),
}));
vi.mock("@/lib/db/index", () => ({ db: { $executeRaw: mockExecuteRaw } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mockSend }; } }));

import { POST } from "../route";
import { NextRequest } from "next/server";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/leads-email", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONTACT_EMAIL = "contacto@movara.com.ar";
});
afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_EMAIL;
});

describe("POST /api/leads-email", () => {
  it("400 con email inválido", async () => {
    expect((await POST(req({ email: "no" }))).status).toBe(400);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it("guarda, avisa a MOVARA (con el email escapado) y responde 201", async () => {
    const res = await POST(req({ email: "ana@example.com", source: "<b>popup</b>" }));
    expect(res.status).toBe(201);
    expect(mockExecuteRaw).toHaveBeenCalled();
    expect(mockSend.mock.calls[0][0]).toMatchObject({ to: "contacto@movara.com.ar", replyTo: "lucianogchiappero@gmail.com" });
    expect(mockSend.mock.calls[0][0].html).toContain("&lt;b&gt;popup&lt;/b&gt;");
  });

  it("sin CONTACT_EMAIL no envía", async () => {
    delete process.env.CONTACT_EMAIL;
    expect((await POST(req({ email: "ana@example.com" }))).status).toBe(201);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("lee el { error } de Resend y loguea solo el tipo; fallas de base solo el tipo", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockExecuteRaw.mockRejectedValueOnce(Object.assign(new Error("ana@example.com duplicado"), { code: "P2010" }));
    mockSend.mockResolvedValueOnce({ data: null, error: { name: "validation_error", statusCode: 422, message: "ana@example.com" } });
    expect((await POST(req({ email: "ana@example.com" }))).status).toBe(201);
    expect(log).toHaveBeenCalledWith("[leads-email] No se pudo guardar: Error (P2010)");
    expect(log).toHaveBeenCalledWith("[leads-email] Falló el email a MOVARA: validation_error (422)");
    expect(JSON.stringify(log.mock.calls)).not.toContain("ana@example.com");
  });

  it("400 si el body no es JSON", async () => {
    expect((await POST(req("x"))).status).toBe(400);
  });

  it("429 al superar 5 por hora por IP: ni guarda ni manda email", async () => {
    rl.consumir.mockResolvedValueOnce(false);
    const res = await POST(req({ email: "ana@example.com" }));
    expect(res.status).toBe(429);
    expect(rl.consumir).toHaveBeenCalledWith(expect.stringMatching(/^leads-email:/), 5, 3_600_000);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("413 con un body de más de 4 KB", async () => {
    expect((await POST(req({ email: "ana@example.com", source: "x".repeat(5000) }))).status).toBe(413);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });

  it("campo trampa completo: 200 sin guardar ni mandar email", async () => {
    const res = await POST(req({ email: "ana@example.com", empresa_web: "x" }));
    expect(res.status).toBe(200);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
