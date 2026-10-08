import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ consumir: vi.fn(), confirmar: vi.fn(), despues: vi.fn(), porToken: vi.fn(), obtenerPdf: vi.fn() }));
vi.mock("@/lib/rate-limit-db", () => ({ claveIP: (s: string, ip: string) => `${s}:${ip}`, consumirRateLimit: m.consumir }));
vi.mock("@/lib/recibos/servicio", () => ({
  confirmarRecibo: m.confirmar,
  despuesDeConfirmar: m.despues,
  reciboPorToken: m.porToken,
  obtenerPdfRecibo: m.obtenerPdf,
  nombreArchivoPdf: (r: { numeroRecibo: string }) => `Recibo en Conformidad ${r.numeroRecibo}.pdf`,
}));

import * as confirmarRoute from "../confirmar/route";
import { GET as PDF } from "../pdf/route";

const TOKEN = "b".repeat(64);
const params = (token = TOKEN) => ({ params: Promise.resolve({ token }) });
const post = (body: unknown) =>
  new NextRequest(`http://localhost/api/recibos/${TOKEN}/confirmar`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "x-forwarded-for": "190.1.2.3", "user-agent": "Mozilla/5.0 (iPhone)" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  m.consumir.mockResolvedValue(true);
});

describe("POST /api/recibos/[token]/confirmar", () => {
  it("la ruta solo expone POST: abrir el link (GET) nunca confirma", () => {
    expect(Object.keys(confirmarRoute)).toEqual(["POST"]);
  });

  it("404 genérico con token mal formado, sin consultar nada", async () => {
    const res = await confirmarRoute.POST(post({ confirmo: true }), params("no-es-token"));
    expect(res.status).toBe(404);
    expect(m.consumir).not.toHaveBeenCalled();
    expect(m.confirmar).not.toHaveBeenCalled();
  });

  it("400 sin { confirmo: true } explícito", async () => {
    for (const body of [{}, { confirmo: "si" }, "no-json"]) {
      expect((await confirmarRoute.POST(post(body), params())).status).toBe(400);
    }
    expect(m.confirmar).not.toHaveBeenCalled();
  });

  it("429 con el rate limit agotado (10 por hora por IP)", async () => {
    m.consumir.mockResolvedValue(false);
    const res = await confirmarRoute.POST(post({ confirmo: true }), params());
    expect(res.status).toBe(429);
    expect(m.consumir).toHaveBeenCalledWith("recibo-confirmar:190.1.2.3", 10, 60 * 60_000);
    expect(m.confirmar).not.toHaveBeenCalled();
  });

  it("404 genérico si el token no existe o el recibo está anulado", async () => {
    m.confirmar.mockResolvedValue({ ok: false, status: 404, error: "LINK_INVALIDO" });
    const res = await confirmarRoute.POST(post({ confirmo: true }), params());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/no es válido/);
  });

  it("409 en la segunda confirmación", async () => {
    m.confirmar.mockResolvedValue({ ok: false, status: 409, error: "Este recibo ya fue confirmado" });
    const res = await confirmarRoute.POST(post({ confirmo: true }), params());
    expect(res.status).toBe(409);
    expect(m.despues).not.toHaveBeenCalled();
  });

  it("confirma con la evidencia de los headers, genera PDF/emails y devuelve el resumen", async () => {
    m.confirmar.mockResolvedValue({
      ok: true,
      recibo: {
        numeroRecibo: "REC-2026-001",
        confirmadoAt: new Date("2026-10-08T13:36:00.000Z"),
        fechaEntrega: new Date("2026-10-08T00:00:00.000Z"),
        hashContenido: "c".repeat(64),
      },
    });
    const res = await confirmarRoute.POST(post({ confirmo: true }), params());
    expect(res.status).toBe(200);
    expect(m.confirmar).toHaveBeenCalledWith(TOKEN, { ip: "190.1.2.3", userAgent: "Mozilla/5.0 (iPhone)" });
    expect(m.despues).toHaveBeenCalled();
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, numeroRecibo: "REC-2026-001", garantiaHastaTexto: "8 de octubre de 2027", hashAbreviado: "cccccccc…cccccccc" });
    expect(json.confirmadoTexto).toMatch(/10:36/);
  });
});

describe("GET /api/recibos/[token]/pdf", () => {
  const req = new NextRequest(`http://localhost/api/recibos/${TOKEN}/pdf`);

  it("404 con token mal formado, inexistente/anulado o recibo sin confirmar", async () => {
    expect((await PDF(req, params("x"))).status).toBe(404);
    m.porToken.mockResolvedValueOnce(null);
    expect((await PDF(req, params())).status).toBe(404);
    m.porToken.mockResolvedValueOnce({ estado: "pendiente" });
    expect((await PDF(req, params())).status).toBe(404);
  });

  it("descarga el PDF del recibo confirmado", async () => {
    m.porToken.mockResolvedValue({ estado: "confirmado", numeroRecibo: "REC-2026-001" });
    m.obtenerPdf.mockResolvedValue(Buffer.from("%PDF"));
    const res = await PDF(req, params());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });
});
