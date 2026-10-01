// @vitest-environment node
//
// jsdom trae su propio File/FormData, distintos de los que usa
// NextRequest.formData() — mismo criterio que los otros routes con upload.
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAdminUser,
  mockFindUniqueUnidad,
  mockTransaction,
  mockTxCreateAcuerdo,
  mockTxCreateMovimiento,
  mockPeriodoCerrado,
  mockUpload,
} = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUniqueUnidad: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxCreateAcuerdo: vi.fn(),
  mockTxCreateMovimiento: vi.fn(),
  mockPeriodoCerrado: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { unidad: { findUnique: mockFindUniqueUnidad }, $transaction: mockTransaction } }));
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
  unidadId: "u1",
  proveedor: "Heshi",
  concepto: "fabrica",
  descripcion: "Primera cuota fábrica",
  moneda: "USD",
  importe: "9000",
  fecha: "2026-09-10",
  estado: "pagado",
  modalidad: "transferencia",
  notas: "",
};

function makeRequest(campos: Record<string, string | File> = CAMPOS): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.set(k, v);
  return new NextRequest("http://localhost/api/admin/pagos", { method: "POST", body: form });
}

const pdf = () => new File([new Uint8Array([37, 80, 68, 70])], "factura.pdf", { type: "application/pdf" });

describe("POST /api/admin/pagos — pago directo a proveedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue({ email: "a@x.com", rol: "admin" });
    mockFindUniqueUnidad.mockResolvedValue({ id: "u1" });
    mockPeriodoCerrado.mockResolvedValue(false);
    mockUpload.mockResolvedValue(undefined);
    mockTxCreateAcuerdo.mockResolvedValue({ id: "p1", cuotas: [{ id: "q1" }] });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({ acuerdoPago: { create: mockTxCreateAcuerdo }, movimiento: { create: mockTxCreateMovimiento } })
    );
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await POST(makeRequest())).status).toBe(401);
  });

  it("400 si el body no es un formulario", async () => {
    const req = new NextRequest("http://localhost/api/admin/pagos", { method: "POST", body: "x" });
    expect((await POST(req)).status).toBe(400);
  });

  it("400 sin unidad", async () => {
    const { unidadId: _omit, ...sinUnidad } = CAMPOS;
    void _omit;
    const res = await POST(makeRequest(sinUnidad));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Falta la unidad");
  });

  it("400 con datos inválidos (concepto, importe, proveedor)", async () => {
    expect((await POST(makeRequest({ ...CAMPOS, concepto: "venta" }))).status).toBe(400);
    expect((await POST(makeRequest({ ...CAMPOS, importe: "0" }))).status).toBe(400);
    const res = await POST(makeRequest({ ...CAMPOS, proveedor: " " }));
    expect((await res.json()).error).toBe("Falta el proveedor");
  });

  it("404 si la unidad no existe", async () => {
    mockFindUniqueUnidad.mockResolvedValueOnce(null);
    expect((await POST(makeRequest())).status).toBe(404);
  });

  it("pagado: crea el acuerdo con una cuota pagada y el movimiento con la fecha real", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: "p1" });
    const acuerdo = mockTxCreateAcuerdo.mock.calls[0][0].data;
    expect(acuerdo).toMatchObject({
      unidadId: "u1",
      tipo: "pago",
      concepto: "fabrica",
      contraparte: "Heshi",
      descripcion: "Primera cuota fábrica",
      moneda: "USD",
      totalAcordado: 9000,
      notas: null,
      registradoPor: "a@x.com",
    });
    expect(acuerdo.cuotas.create).toMatchObject({ descripcion: "Primera cuota fábrica", importe: 9000, estado: "pagado" });
    expect(mockTxCreateMovimiento).toHaveBeenCalledWith({
      data: expect.objectContaining({
        acuerdoId: "p1",
        cuotaId: "q1",
        fecha: new Date("2026-09-10"),
        importe: 9000,
        modalidad: "transferencia",
        comprobanteUrl: null,
      }),
    });
  });

  it("pendiente: sin movimiento; la cuota queda pendiente o vencida según la fecha; descripción por defecto = concepto", async () => {
    await POST(makeRequest({ ...CAMPOS, estado: "pendiente", descripcion: "", fecha: "2099-01-01", concepto: "seguro" }));
    expect(mockTxCreateMovimiento).not.toHaveBeenCalled();
    expect(mockTxCreateAcuerdo.mock.calls[0][0].data.cuotas.create).toMatchObject({ descripcion: "Seguro", estado: "pendiente" });
    expect(mockPeriodoCerrado).not.toHaveBeenCalled();

    await POST(makeRequest({ ...CAMPOS, estado: "pendiente", fecha: "2020-01-01" }));
    expect(mockTxCreateAcuerdo.mock.calls[1][0].data.cuotas.create.estado).toBe("vencido");
  });

  it("sube el comprobante y lo guarda en el movimiento", async () => {
    await POST(makeRequest({ ...CAMPOS, comprobante: pdf() }));
    expect(mockUpload).toHaveBeenCalledWith("documentos-movara", "pagos/u1/factura.pdf", expect.any(ArrayBuffer), "application/pdf");
    expect(mockTxCreateMovimiento.mock.calls[0][0].data.comprobanteUrl).toBe("pagos/u1/factura.pdf");
  });

  it("400 si se adjunta comprobante a un pago pendiente", async () => {
    const res = await POST(makeRequest({ ...CAMPOS, estado: "pendiente", comprobante: pdf() }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/solo se adjunta a un pago ya realizado/);
  });

  it("400 si el comprobante no es un tipo de archivo válido", async () => {
    const exe = new File([new Uint8Array([1, 2])], "virus.exe", { type: "application/x-msdownload" });
    const res = await POST(makeRequest({ ...CAMPOS, comprobante: exe }));
    expect(res.status).toBe(400);
    expect(mockTxCreateAcuerdo).not.toHaveBeenCalled();
  });

  it("500 si falla la subida del comprobante", async () => {
    mockUpload.mockRejectedValueOnce(new Error("storage down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({ ...CAMPOS, comprobante: pdf() }));
    expect(res.status).toBe(500);
    expect(mockTxCreateAcuerdo).not.toHaveBeenCalled();
  });

  it("400 si el pago cae en un período cerrado", async () => {
    mockPeriodoCerrado.mockResolvedValueOnce(true);
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/período ya está cerrado/);
  });
});
