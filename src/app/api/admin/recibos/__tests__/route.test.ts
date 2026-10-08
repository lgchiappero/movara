import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ session: vi.fn(), crear: vi.fn(), enviar: vi.fn() }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.session }));
vi.mock("@/lib/recibos/servicio", () => ({ crearRecibo: m.crear, enviarSolicitud: m.enviar }));

import { POST } from "../route";

const req = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/admin/recibos", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const BODY = { unidadId: "u1", fechaEntrega: "2026-10-08", lugarEntrega: "Sunchales" };

beforeEach(() => {
  vi.clearAllMocks();
  m.session.mockResolvedValue({ id: "a1", email: "admin@movara.com.ar", nombre: "Admin", rol: "vendedor" });
});

describe("POST /api/admin/recibos", () => {
  it("401 sin sesión", async () => {
    m.session.mockResolvedValue(null);
    expect((await POST(req(BODY))).status).toBe(401);
  });

  it("400 con datos inválidos o body no JSON (con el primer mensaje)", async () => {
    const res = await POST(req({ ...BODY, lugarEntrega: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Indicá el lugar de entrega");
    expect((await POST(req("x"))).status).toBe(400);
    expect(m.crear).not.toHaveBeenCalled();
  });

  it("propaga el error del servicio (falta email, recibo vigente)", async () => {
    m.crear.mockResolvedValue({ ok: false, status: 409, error: "La unidad ya tiene el recibo REC-2026-001 sin anular" });
    const res = await POST(req(BODY));
    expect(res.status).toBe(409);
    expect(m.enviar).not.toHaveBeenCalled();
  });

  it("201: crea con el email de la sesión y envía el link con el origen del request", async () => {
    m.crear.mockResolvedValue({ ok: true, recibo: { id: "r1", numeroRecibo: "REC-2026-001" } });
    m.enviar.mockResolvedValue({ ok: true });
    const res = await POST(req(BODY));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: "r1", numeroRecibo: "REC-2026-001", emailEnviado: true });
    expect(m.crear.mock.calls[0][1]).toBe("admin@movara.com.ar");
    expect(m.enviar.mock.calls[0][1]).toBe("http://localhost:3000");
  });

  it("201 aunque el email falle, informando el error", async () => {
    m.crear.mockResolvedValue({ ok: true, recibo: { id: "r1", numeroRecibo: "REC-2026-001" } });
    m.enviar.mockResolvedValue({ ok: false, error: "rebotó" });
    const res = await POST(req(BODY));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ emailEnviado: false, emailError: "rebotó" });
  });
});
