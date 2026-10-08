import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ session: vi.fn(), anular: vi.fn(), enviar: vi.fn(), findUnique: vi.fn(), obtenerPdf: vi.fn() }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.session }));
vi.mock("@/lib/db", () => ({ db: { reciboConformidad: { findUnique: m.findUnique } } }));
vi.mock("@/lib/recibos/servicio", () => ({
  anularRecibo: m.anular,
  enviarSolicitud: m.enviar,
  obtenerPdfRecibo: m.obtenerPdf,
  nombreArchivoPdf: (r: { numeroRecibo: string }) => `Recibo en Conformidad ${r.numeroRecibo}.pdf`,
}));

import { PATCH } from "../route";
import { POST as REENVIAR } from "../reenviar/route";
import { GET as PDF } from "../pdf/route";

const params = { params: Promise.resolve({ id: "r1" }) };
const ADMIN = { id: "a1", email: "admin@movara.com.ar", nombre: "Admin", rol: "admin" };
const patch = (body: unknown) => new NextRequest("http://localhost/api/admin/recibos/r1", { method: "PATCH", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  m.session.mockResolvedValue(ADMIN);
});

describe("PATCH /api/admin/recibos/[id] (anular)", () => {
  it("401 sin sesión y 403 para el rol vendedor", async () => {
    m.session.mockResolvedValueOnce(null);
    expect((await PATCH(patch({ accion: "anular" }), params)).status).toBe(401);
    m.session.mockResolvedValueOnce({ ...ADMIN, rol: "vendedor" });
    expect((await PATCH(patch({ accion: "anular" }), params)).status).toBe(403);
    expect(m.anular).not.toHaveBeenCalled();
  });

  it("400 sin la acción explícita", async () => {
    expect((await PATCH(patch({}), params)).status).toBe(400);
  });

  it("anula como admin, o devuelve el error del servicio", async () => {
    m.anular.mockResolvedValueOnce({ ok: true });
    expect((await PATCH(patch({ accion: "anular" }), params)).status).toBe(200);
    expect(m.anular).toHaveBeenCalledWith("r1", "admin@movara.com.ar");
    m.anular.mockResolvedValueOnce({ ok: false, status: 409, error: "Solo se puede anular un recibo pendiente" });
    expect((await PATCH(patch({ accion: "anular" }), params)).status).toBe(409);
  });
});

describe("POST /api/admin/recibos/[id]/reenviar", () => {
  const req = new NextRequest("http://localhost:3000/api/admin/recibos/r1/reenviar", { method: "POST" });

  it("401, 404 y 409 si no está pendiente", async () => {
    m.session.mockResolvedValueOnce(null);
    expect((await REENVIAR(req, params)).status).toBe(401);
    m.findUnique.mockResolvedValueOnce(null);
    expect((await REENVIAR(req, params)).status).toBe(404);
    m.findUnique.mockResolvedValueOnce({ id: "r1", estado: "confirmado" });
    expect((await REENVIAR(req, params)).status).toBe(409);
  });

  it("reenvía; 502 si el email falla", async () => {
    m.findUnique.mockResolvedValue({ id: "r1", estado: "pendiente" });
    m.enviar.mockResolvedValueOnce({ ok: true });
    expect((await REENVIAR(req, params)).status).toBe(200);
    expect(m.enviar.mock.calls[0][1]).toBe("http://localhost:3000");
    m.enviar.mockResolvedValueOnce({ ok: false, error: "rebotó" });
    const res = await REENVIAR(req, params);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("rebotó");
  });
});

describe("GET /api/admin/recibos/[id]/pdf", () => {
  const req = new NextRequest("http://localhost/api/admin/recibos/r1/pdf");

  it("404 si no existe y 409 si no está confirmado", async () => {
    m.findUnique.mockResolvedValueOnce(null);
    expect((await PDF(req, params)).status).toBe(404);
    m.findUnique.mockResolvedValueOnce({ estado: "pendiente" });
    expect((await PDF(req, params)).status).toBe(409);
  });

  it("descarga el PDF del recibo confirmado", async () => {
    m.findUnique.mockResolvedValue({ estado: "confirmado", numeroRecibo: "REC-2026-001" });
    m.obtenerPdf.mockResolvedValue(Buffer.from("%PDF"));
    const res = await PDF(req, params);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("Recibo en Conformidad REC-2026-001.pdf");
  });
});
