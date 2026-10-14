import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ usaLocal: vi.fn(), download: vi.fn(), firmaValida: vi.fn(), guardar: vi.fn() }));
vi.mock("@/lib/admin/storage", () => ({
  usaStorageLocal: m.usaLocal,
  downloadDocument: m.download,
  firmaSubidaLocalValida: m.firmaValida,
  guardarSubidaLocal: m.guardar,
}));

import { GET, PUT } from "../route";

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

describe("PUT /api/admin/storage-local (URL firmada de subida local)", () => {
  const put = (qs: string, body: BodyInit = "%PDF", tipo = "application/pdf") =>
    PUT(new NextRequest(`http://localhost/api/admin/storage-local${qs}`, { method: "PUT", body, headers: { "content-type": tipo } }));
  const QS = "?bucket=b&path=envios/e1/a.pdf&vence=9999999999999&firma=abc";

  beforeEach(() => m.firmaValida.mockReturnValue(true));

  it("404 fuera del storage local", async () => {
    m.usaLocal.mockReturnValue(false);
    expect((await put(QS)).status).toBe(404);
    expect(m.guardar).not.toHaveBeenCalled();
  });

  it("403 con firma inválida o sin parámetros", async () => {
    m.firmaValida.mockReturnValue(false);
    expect((await put(QS)).status).toBe(403);
    expect((await put("?bucket=b")).status).toBe(403);
    expect(m.guardar).not.toHaveBeenCalled();
  });

  it("guarda el archivo con su tipo", async () => {
    const res = await put(QS);
    expect(res.status).toBe(200);
    expect(m.firmaValida).toHaveBeenCalledWith("b", "envios/e1/a.pdf", 9999999999999, "abc");
    expect(m.guardar).toHaveBeenCalledWith("b", "envios/e1/a.pdf", expect.any(ArrayBuffer), "application/pdf");
  });

  it("413 si supera 20 MB y 409 si ya existe", async () => {
    expect((await put(QS, new Uint8Array(20 * 1024 * 1024 + 1))).status).toBe(413);
    m.guardar.mockRejectedValueOnce(new Error("EEXIST"));
    expect((await put(QS)).status).toBe(409);
  });
});
