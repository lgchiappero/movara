import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ── vi.hoisted ensures mockUpdate is available when vi.mock factory runs ──────
const { mockUpdate } = vi.hoisted(() => ({
  mockUpdate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db", () => ({
  db: { order: { update: mockUpdate } },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { POST, verifyWebhook } from "../route";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = "test-webhook-secret";

function makeSignature(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(body: string, signature: string): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/mp", {
    method: "POST",
    body,
    headers: { "x-signature": signature, "content-type": "application/json" },
  });
}

// ── verifyWebhook unit tests ──────────────────────────────────────────────────

describe("verifyWebhook — comparación timing-safe", () => {
  beforeEach(() => { process.env.MP_WEBHOOK_SECRET = SECRET; });
  afterEach(() => { delete process.env.MP_WEBHOOK_SECRET; });

  it("retorna true para firma válida (hex plano)", () => {
    const body = '{"type":"payment"}';
    expect(verifyWebhook(body, makeSignature(body))).toBe(true);
  });

  it("retorna true para firma en formato 'ts=<n>,v1=<hex>'", () => {
    const body = '{"type":"payment"}';
    const hex = makeSignature(body);
    expect(verifyWebhook(body, `ts=1700000000,v1=${hex}`)).toBe(true);
  });

  it("retorna false para firma incorrecta", () => {
    expect(verifyWebhook('{"type":"payment"}', "deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000")).toBe(false);
  });

  it("retorna false cuando MP_WEBHOOK_SECRET no está definido — fail-closed", () => {
    delete process.env.MP_WEBHOOK_SECRET;
    expect(verifyWebhook('{"type":"payment"}', makeSignature('{"type":"payment"}'))).toBe(false);
  });

  it("retorna false para hex inválido sin lanzar excepción", () => {
    expect(() => verifyWebhook("body", "no-es-hex-!!!")).not.toThrow();
    expect(verifyWebhook("body", "no-es-hex-!!!")).toBe(false);
  });

  it("retorna false cuando el cuerpo fue alterado después de firmar", () => {
    const sig = makeSignature("original");
    expect(verifyWebhook("tampered", sig)).toBe(false);
  });
});

// ── POST handler integration tests ───────────────────────────────────────────

describe("POST /api/webhooks/mp", () => {
  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = SECRET;
    mockUpdate.mockClear();
  });
  afterEach(() => { delete process.env.MP_WEBHOOK_SECRET; });

  it("devuelve 401 cuando la firma es inválida", async () => {
    const body = '{"type":"payment","action":"payment.updated","data":{"id":"123"}}';
    const res = await POST(makeRequest(body, "invalida"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid signature");
  });

  it("devuelve 401 cuando MP_WEBHOOK_SECRET no está configurado", async () => {
    delete process.env.MP_WEBHOOK_SECRET;
    const body = '{"type":"payment"}';
    const res = await POST(makeRequest(body, makeSignature(body)));
    expect(res.status).toBe(401);
  });

  it("devuelve 200 sin tocar DB para eventos que no son payment.updated", async () => {
    const body = JSON.stringify({ type: "subscription", action: "subscription.created" });
    const res = await POST(makeRequest(body, makeSignature(body)));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("llama a db.order.update cuando el pago está aprobado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({ status: "approved", external_reference: "order-abc" }),
    }));

    const body = JSON.stringify({ type: "payment", action: "payment.updated", data: { id: "pay-123" } });
    const res = await POST(makeRequest(body, makeSignature(body)));

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "order-abc" },
      data: { status: "PAID", paymentId: "pay-123" },
    });
    vi.unstubAllGlobals();
  });

  it("no actualiza DB cuando el pago no está aprobado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({ status: "pending", external_reference: "order-abc" }),
    }));

    const body = JSON.stringify({ type: "payment", action: "payment.updated", data: { id: "pay-456" } });
    await POST(makeRequest(body, makeSignature(body)));

    expect(mockUpdate).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("devuelve 500 cuando la llamada a la API de MP falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const body = JSON.stringify({ type: "payment", action: "payment.updated", data: { id: "pay-789" } });
    const res = await POST(makeRequest(body, makeSignature(body)));

    expect(res.status).toBe(500);
    vi.unstubAllGlobals();
  });
});
