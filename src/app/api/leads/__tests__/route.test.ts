import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockCreate, mockSend, mockConsumir } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue({}),
  mockSend: vi.fn().mockResolvedValue({ data: { id: "e1" }, error: null }),
  mockConsumir: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { lead: { create: mockCreate } } }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));
vi.mock("@/lib/rate-limit-db", () => ({
  claveIP: (scope: string, ip: string) => `${scope}:${ip}`,
  consumirRateLimit: mockConsumir,
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

function req(body: unknown, ip = "190.1.2.3") {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

const LEAD = {
  nombre: `<b>Ana</b> <a href="https://phish.example">click</a>`,
  telefono: "+5491155554444",
  email: "ana@example.com",
  mensaje: `<script>alert(1)</script> & "hola"`,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockConsumir.mockResolvedValue(true);
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONTACT_EMAIL = "contacto@movara.com.ar";
});
afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_EMAIL;
});

describe("POST /api/leads", () => {
  it("400 con datos inválidos, sin consumir cupo de rate limit", async () => {
    const res = await POST(req({ nombre: "A" }));
    expect(res.status).toBe(400);
    expect(mockConsumir).not.toHaveBeenCalled();
  });

  it("aplica rate limit de 3 por hora por IP", async () => {
    await POST(req(LEAD, "200.0.0.9"));
    expect(mockConsumir).toHaveBeenCalledWith("leads:200.0.0.9", 3, 60 * 60_000);
  });

  it("429 cuando se agotó el cupo: no guarda ni envía emails", async () => {
    mockConsumir.mockResolvedValue(false);
    const res = await POST(req(LEAD));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/Probá en una hora/);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("si el rate limit falla (DB caída) deja pasar el lead", async () => {
    mockConsumir.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req(LEAD));
    expect(res.status).toBe(201);
    expect(mockSend).toHaveBeenCalled();
  });

  it("escapa el HTML del nombre y el mensaje en los dos emails", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(req(LEAD));
    expect(res.status).toBe(201);
    expect(mockSend).toHaveBeenCalledTimes(2);
    for (const [arg] of mockSend.mock.calls) {
      expect(arg.html).not.toContain("<script>");
      expect(arg.html).not.toContain('<a href="https://phish.example">');
      expect(arg.html).not.toContain("<b>Ana</b>");
    }
    const cliente = mockSend.mock.calls.find(([a]) => a.to === "ana@example.com")![0];
    expect(cliente.html).toContain("Hola &lt;b&gt;Ana&lt;/b&gt;");
    expect(cliente.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;hola&quot;");
  });

  it("guarda todos los campos opcionales y los muestra escapados en el email al admin", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await POST(req({ ...LEAD, apellido: "Pérez", dni: "12345678", provincia: "Santa Fe" }));
    expect(mockCreate.mock.calls[0][0].data).toMatchObject({ apellido: "Pérez", dni: "12345678", provincia: "Santa Fe" });
    const admin = mockSend.mock.calls.find(([a]) => a.to === "contacto@movara.com.ar")![0];
    expect(admin.html).toContain("12345678");
    expect(admin.html).toContain("Santa Fe");
  });

  it("sin email del lead ni mensaje solo notifica al admin", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await POST(req({ nombre: "Ana", telefono: "+5491155554444" }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].to).toBe("contacto@movara.com.ar");
    expect(mockSend.mock.calls[0][0].html).toContain("—");
  });

  it("sin RESEND_API_KEY no envía emails pero igual guarda el lead", async () => {
    delete process.env.RESEND_API_KEY;
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(req(LEAD));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("si la base y los emails fallan igual responde 201 (y lo loguea)", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error("db"));
    mockSend.mockRejectedValue(new Error("resend"));
    const res = await POST(req(LEAD));
    expect(res.status).toBe(201);
    expect(err).toHaveBeenCalledWith("[leads] Both DB and email failed for lead:", expect.anything(), expect.anything());
    mockSend.mockResolvedValue({ data: { id: "e1" }, error: null });
  });

  it("sin CONTACT_EMAIL solo envía la confirmación al cliente", async () => {
    delete process.env.CONTACT_EMAIL;
    vi.spyOn(console, "log").mockImplementation(() => {});
    await POST(req(LEAD));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].to).toBe("ana@example.com");
  });

  it("500 si el body no es JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(new NextRequest("http://localhost/api/leads", { method: "POST", body: "x" }));
    expect(res.status).toBe(500);
  });
});
