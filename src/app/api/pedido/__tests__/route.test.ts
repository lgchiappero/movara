import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindMany, mockSend } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn().mockResolvedValue([]),
  mockSend: vi.fn().mockResolvedValue({ data: { id: "e1" }, error: null }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock("@/lib/db", () => {
  const tx = { configuracionPedido: { create: mockCreate, findMany: mockFindMany } };
  return { db: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } };
});

import { POST } from "../route";
import { NextRequest } from "next/server";

const BASE = {
  clienteNombre: "Ana García",
  clienteWhatsapp: "+5491155554444",
  clienteEmail: "ana@example.com",
  tipoCliente: "particular",
  modelo: "20ft",
  finalidad: "inversor",
  provincia: "Buenos Aires",
  localidad: "La Plata",
  habitaciones: 2,
  incluyeCocina: true,
  tipoCocina: "electrico",
  incluyeBano: true,
  tipoAgua: "calefon-electrico",
  lavarropas: "sin",
  materiales: {},
  upgrades: [],
};

function req(body: unknown, ip: string) {
  return new NextRequest("http://localhost/api/pedido", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/pedido", () => {
  it("devuelve el número de consulta y el token de seguimiento generado por la base", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    const res = await POST(req(BASE, "10.0.0.1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.numeroConsulta).toMatch(/^MOV-CONSULTA-\d{4}-001$/);
    expect(json.tokenSeguimiento).toBe("f".repeat(64));
    expect(mockCreate.mock.calls[0][0].select).toEqual({ tokenSeguimiento: true });
  });

  it("400 con el detalle del campo cuando falta la localidad", async () => {
    const res = await POST(req({ ...BASE, localidad: "" }, "10.0.0.2"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details[0].path).toEqual(["localidad"]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("avisa al admin por email con el número de consulta (y tolera que falle)", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req(BASE, "10.0.0.3"));
    expect(mockSend.mock.calls[0][0].subject).toMatch(/Nueva consulta — Ana García/);

    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error("resend"));
    expect((await POST(req(BASE, "10.0.0.4"))).status).toBe(200);
    delete process.env.RESEND_API_KEY;
  });

  it("500 si falla la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error("db"));
    expect((await POST(req(BASE, "10.0.0.5"))).status).toBe(500);
  });

  it("429 al superar el límite por IP", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    let ultimo = 0;
    for (let i = 0; i < 61; i++) ultimo = (await POST(req(BASE, "10.0.0.99"))).status;
    expect(ultimo).toBe(429);
  });
});
