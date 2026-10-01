// @vitest-environment node
//
// jsdom trae su propio File/FormData, distintos de los que usa
// NextRequest.formData() — mismo criterio que los otros routes con upload.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUniqueEnvio, mockCreateCosto, mockPeriodoCerrado, mockUpload } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUniqueEnvio: vi.fn(),
  mockCreateCosto: vi.fn(),
  mockPeriodoCerrado: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { envio: { findUnique: mockFindUniqueEnvio }, costoLogistica: { create: mockCreateCosto } } }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/cobranza/periodo-cerrado", () => ({ periodoEstaCerrado: mockPeriodoCerrado }));
vi.mock("@/lib/admin/storage", () => ({
  buildStoragePath: (scope: string, id: string, name: string) => `${scope}/${id}/${name}`,
  uploadDocument: mockUpload,
  BUCKET_MOVARA: "documentos-movara",
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

const CAMPOS = {
  envioId: "e1",
  concepto: "flete",
  descripcion: "Shanghai → BA",
  moneda: "USD",
  importe: "4200",
  fecha: "2026-09-10",
  estado: "pagado",
  notas: "",
  prorratear: "false",
};

function makeRequest(campos: Record<string, string | File> = CAMPOS): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.set(k, v);
  return new NextRequest("http://localhost/api/admin/logistica", { method: "POST", body: form });
}
const pdf = () => new File([new Uint8Array([37, 80, 68, 70])], "flete.pdf", { type: "application/pdf" });

describe("POST /api/admin/logistica — costo de logística internacional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue({ email: "a@x.com", rol: "admin" });
    mockFindUniqueEnvio.mockResolvedValue({ id: "e1", unidades: [{ id: "u1" }, { id: "u2" }, { id: "u3" }] });
    mockPeriodoCerrado.mockResolvedValue(false);
    mockUpload.mockResolvedValue(undefined);
    mockCreateCosto.mockResolvedValue({ id: "c1" });
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await POST(makeRequest())).status).toBe(401);
  });

  it("400 si el body no es un formulario, falta el envío o los datos son inválidos", async () => {
    expect((await POST(new NextRequest("http://localhost/api/admin/logistica", { method: "POST", body: "x" }))).status).toBe(400);
    const { envioId: _e, ...sinEnvio } = CAMPOS;
    void _e;
    const res = await POST(makeRequest(sinEnvio));
    expect((await res.json()).error).toBe("Falta el envío");
    expect((await POST(makeRequest({ ...CAMPOS, concepto: "fabrica" }))).status).toBe(400);
    expect((await POST(makeRequest({ ...CAMPOS, importe: "-1" }))).status).toBe(400);
    expect((await POST(makeRequest({ ...CAMPOS, estado: "a medias" }))).status).toBe(400);
  });

  it("404 si el envío no existe", async () => {
    mockFindUniqueEnvio.mockResolvedValueOnce(null);
    expect((await POST(makeRequest())).status).toBe(404);
  });

  it("crea el costo del envío sin prorrateo", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: "c1" });
    expect(mockCreateCosto).toHaveBeenCalledWith({
      data: {
        envioId: "e1",
        concepto: "flete",
        descripcion: "Shanghai → BA",
        moneda: "USD",
        importe: 4200,
        fecha: new Date("2026-09-10"),
        estado: "pagado",
        comprobanteUrl: null,
        notas: null,
        prorrateado: false,
        registradoPor: "a@x.com",
      },
      select: { id: true },
    });
  });

  it("con prorratear=true crea un registro de costo por unidad del envío (partes iguales, centavos exactos)", async () => {
    await POST(makeRequest({ ...CAMPOS, importe: "1000", prorratear: "true" }));
    const data = mockCreateCosto.mock.calls[0][0].data;
    expect(data.prorrateado).toBe(true);
    expect(data.prorrateos.create).toEqual([
      { unidadId: "u1", importe: 333.33 },
      { unidadId: "u2", importe: 333.33 },
      { unidadId: "u3", importe: 333.34 },
    ]);
  });

  it("400 si se pide prorratear y el envío no tiene unidades", async () => {
    mockFindUniqueEnvio.mockResolvedValueOnce({ id: "e1", unidades: [] });
    const res = await POST(makeRequest({ ...CAMPOS, prorratear: "true" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no tiene unidades/);
  });

  it("pendiente: no chequea período cerrado; con comprobante → 400", async () => {
    await POST(makeRequest({ ...CAMPOS, estado: "pendiente" }));
    expect(mockPeriodoCerrado).not.toHaveBeenCalled();
    const res = await POST(makeRequest({ ...CAMPOS, estado: "pendiente", comprobante: pdf() }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/solo se adjunta a un pago ya realizado/);
  });

  it("400 si el pago cae en un período cerrado", async () => {
    mockPeriodoCerrado.mockResolvedValueOnce(true);
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect(mockCreateCosto).not.toHaveBeenCalled();
  });

  it("sube el comprobante a logistica/<envío>/", async () => {
    await POST(makeRequest({ ...CAMPOS, comprobante: pdf() }));
    expect(mockUpload).toHaveBeenCalledWith("documentos-movara", "logistica/e1/flete.pdf", expect.any(ArrayBuffer), "application/pdf");
    expect(mockCreateCosto.mock.calls[0][0].data.comprobanteUrl).toBe("logistica/e1/flete.pdf");
  });

  it("400 con archivo inválido; 500 si falla la subida", async () => {
    const exe = new File([new Uint8Array([1])], "x.exe", { type: "application/x-msdownload" });
    expect((await POST(makeRequest({ ...CAMPOS, comprobante: exe }))).status).toBe(400);
    mockUpload.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(makeRequest({ ...CAMPOS, comprobante: pdf() }))).status).toBe(500);
    expect(mockCreateCosto).not.toHaveBeenCalled();
  });
});
