import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { baseUrlLinks, evidenciaRequest, respuestaPdf } from "./http";

afterEach(() => vi.unstubAllEnvs());

describe("http de recibos", () => {
  it("baseUrlLinks: dominio público en producción, origen del request en dev", () => {
    const req = new NextRequest("http://localhost:3000/api/admin/recibos");
    expect(baseUrlLinks(req)).toBe("http://localhost:3000");
    vi.stubEnv("NODE_ENV", "production");
    expect(baseUrlLinks(req)).toBe("https://movara.com.ar");
  });

  it("evidenciaRequest toma IP y user-agent de los headers (UA truncado)", () => {
    const req = new NextRequest("http://x/", { headers: { "x-forwarded-for": "190.1.2.3, 10.0.0.1", "user-agent": "U".repeat(600) } });
    const ev = evidenciaRequest(req);
    expect(ev.ip).toBe("190.1.2.3");
    expect(ev.userAgent).toHaveLength(500);
    expect(evidenciaRequest(new NextRequest("http://x/"))).toEqual({ ip: null, userAgent: null });
  });

  it("respuestaPdf arma los headers de descarga privada", async () => {
    const res = respuestaPdf(Buffer.from("%PDF"), "Recibo en Conformidad REC-2026-001.pdf");
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="Recibo en Conformidad REC-2026-001.pdf"');
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(respuestaPdf(Buffer.from(""), 'a"b.pdf', "inline").headers.get("content-disposition")).toBe('inline; filename="a_b.pdf"');
    expect(await res.text()).toBe("%PDF");
  });
});
