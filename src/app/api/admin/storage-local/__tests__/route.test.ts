import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ usaLocal: vi.fn(), download: vi.fn() }));
vi.mock("@/lib/admin/storage", () => ({ usaStorageLocal: m.usaLocal, downloadDocument: m.download }));

import { GET } from "../route";

const req = (qs: string) => new NextRequest(`http://localhost/api/admin/storage-local${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  m.usaLocal.mockReturnValue(true);
});

describe("GET /api/admin/storage-local", () => {
  it("404 si no se usa el storage local (producción o con Supabase)", async () => {
    m.usaLocal.mockReturnValue(false);
    expect((await GET(req("?bucket=b&path=p.pdf"))).status).toBe(404);
    expect(m.download).not.toHaveBeenCalled();
  });

  it("400 sin parámetros", async () => {
    expect((await GET(req("?bucket=b"))).status).toBe(400);
  });

  it("sirve el archivo con su tipo, o 404 si no existe", async () => {
    m.download.mockResolvedValueOnce(Buffer.from("%PDF"));
    const res = await GET(req("?bucket=b&path=unidades/u1/a.PDF"));
    expect(res.headers.get("content-type")).toBe("application/pdf");
    m.download.mockResolvedValueOnce(Buffer.from("x"));
    expect((await GET(req("?bucket=b&path=archivo"))).headers.get("content-type")).toBe("application/octet-stream");
    m.download.mockRejectedValueOnce(new Error("ENOENT"));
    expect((await GET(req("?bucket=b&path=no.pdf"))).status).toBe(404);
  });
});
