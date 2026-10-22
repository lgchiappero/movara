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

  it("si Resend devuelve { error } lo loguea con el tipo, sin datos personales, y responde 200", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    mockSend.mockResolvedValueOnce({ data: null, error: { name: "validation_error", statusCode: 422, message: "to: ana@example.com" } });
    expect((await POST(req(BASE, "10.0.0.6"))).status).toBe(200);
    const linea = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(linea).toMatch(/\[pedido\] MOV-CONSULTA-\d{4}-\d{3} Falló el email a MOVARA: validation_error \(422\)/);
    expect(linea).not.toMatch(/Ana|ana@example\.com/);
    delete process.env.RESEND_API_KEY;
  });

  it("escapa el nombre del cliente en el HTML del aviso", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, clienteNombre: "Ana & Hijos" }, "10.0.0.7"));
    expect(mockSend.mock.calls[0][0].html).toContain("Ana &amp; Hijos completó");
    delete process.env.RESEND_API_KEY;
  });

  it("guarda las notas de configuración (recortadas) y null si vienen vacías", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, notasConfiguracion: "  Necesito rampa  " }, "10.0.0.20"));
    expect(mockCreate.mock.calls[0][0].data.notasConfiguracion).toBe("Necesito rampa");
    await POST(req({ ...BASE, notasConfiguracion: "   " }, "10.0.0.21"));
    expect(mockCreate.mock.calls[1][0].data.notasConfiguracion).toBeNull();
    await POST(req(BASE, "10.0.0.22"));
    expect(mockCreate.mock.calls[2][0].data.notasConfiguracion).toBeNull();
  });

  it("400 si las notas superan los 1000 caracteres", async () => {
    const res = await POST(req({ ...BASE, notasConfiguracion: "a".repeat(1001) }, "10.0.0.23"));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("el aviso por email lista el balcón como A cotizar y las notas escapadas", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(
      req(
        { ...BASE, materiales: { balcon: "frontal", techoBalcon: "completo" }, notasConfiguracion: "<img src=x onerror=alert(1)>" },
        "10.0.0.24"
      )
    );
    const html: string = mockSend.mock.calls[0][0].html;
    expect(html).toContain("Balcón frontal — <strong");
    expect(html).toContain("Sobretecho completo: balcón y toda la unidad — <strong");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img");
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
