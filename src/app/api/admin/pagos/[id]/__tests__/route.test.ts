// @vitest-environment node
//
// jsdom trae su propio File/FormData, distintos de los que usa
// NextRequest.formData() — mismo criterio que los otros routes con upload.
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAdminUser,
  mockFindUnique,
  mockTransaction,
  mockTx,
  mockPeriodoCerrado,
  mockUpload,
} = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockTx: {
    acuerdoPago: { update: vi.fn() },
    cuota: { update: vi.fn(), create: vi.fn() },
    movimiento: { update: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
  mockPeriodoCerrado: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { acuerdoPago: { findUnique: mockFindUnique }, $transaction: mockTransaction } }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/cobranza/periodo-cerrado", () => ({ periodoEstaCerrado: mockPeriodoCerrado }));
vi.mock("@/lib/admin/storage", () => ({
  buildStoragePath: (scope: string, id: string, name: string) => `${scope}/${id}/${name}`,
  uploadDocument: mockUpload,
  BUCKET_MOVARA: "documentos-movara",
}));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

const CAMPOS = {
  proveedor: "Heshi",
  concepto: "fabrica",
  descripcion: "Saldo fábrica",
  moneda: "USD",
  importe: "21000",
  fecha: "2026-10-01",
  estado: "pagado",
  modalidad: "cripto",
  notas: "USDT",
};

function makeRequest(campos: Record<string, string | File> = CAMPOS): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.set(k, v);
  return new NextRequest("http://localhost/api/admin/pagos/p1", { method: "PATCH", body: form });
}
const params = { params: Promise.resolve({ id: "p1" }) };

const PENDIENTE = { id: "p1", tipo: "pago", unidadId: "u1", cuotas: [{ id: "q1" }], movimientos: [] };
const PAGADO = {
  ...PENDIENTE,
  movimientos: [{ id: "m1", fecha: new Date("2026-09-10"), comprobanteUrl: "pagos/u1/viejo.pdf" }],
};

describe("PATCH /api/admin/pagos/[id] — editar pago a proveedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockReset();
    mockGetAdminUser.mockResolvedValue({ email: "a@x.com", rol: "admin" });
    mockFindUnique.mockResolvedValue(PENDIENTE);
    mockPeriodoCerrado.mockResolvedValue(false);
    mockUpload.mockResolvedValue(undefined);
    mockTx.cuota.update.mockResolvedValue({ id: "q1" });
    mockTx.cuota.create.mockResolvedValue({ id: "q-nueva" });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await PATCH(makeRequest(), params)).status).toBe(401);
  });

  it("400 si el body no es un formulario o es inválido", async () => {
    const req = new NextRequest("http://localhost/api/admin/pagos/p1", { method: "PATCH", body: "x" });
    expect((await PATCH(req, params)).status).toBe(400);
    expect((await PATCH(makeRequest({ ...CAMPOS, estado: "a medias" }), params)).status).toBe(400);
  });

  it("404 si no existe o no es un pago a proveedor", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect((await PATCH(makeRequest(), params)).status).toBe(404);
    mockFindUnique.mockResolvedValueOnce({ ...PENDIENTE, tipo: "cobro" });
    expect((await PATCH(makeRequest(), params)).status).toBe(404);
  });

  it("400 para acuerdos con el formato anterior (varias cuotas o pagos)", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...PENDIENTE, cuotas: [{ id: "q1" }, { id: "q2" }] });
    const res = await PATCH(makeRequest(), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/formato anterior/);
  });

  it("actualiza los datos del acuerdo y de la cuota", async () => {
    expect((await PATCH(makeRequest(), params)).status).toBe(200);
    expect(mockTx.acuerdoPago.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        concepto: "fabrica",
        descripcion: "Saldo fábrica",
        contraparte: "Heshi",
        moneda: "USD",
        totalAcordado: 21000,
        notas: "USDT",
      },
    });
    expect(mockTx.cuota.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { descripcion: "Saldo fábrica", importe: 21000, vencimiento: new Date("2026-10-01"), estado: "pagado" },
      select: { id: true },
    });
  });

  it("pendiente → pagado: crea el movimiento", async () => {
    await PATCH(makeRequest(), params);
    expect(mockTx.movimiento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acuerdoId: "p1", cuotaId: "q1", importe: 21000, modalidad: "cripto", registradoPor: "a@x.com", comprobanteUrl: null }),
    });
  });

  it("pagado → pagado: actualiza el movimiento y conserva el comprobante si no se sube otro", async () => {
    mockFindUnique.mockResolvedValueOnce(PAGADO);
    await PATCH(makeRequest(), params);
    expect(mockTx.movimiento.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({ fecha: new Date("2026-10-01"), comprobanteUrl: "pagos/u1/viejo.pdf" }),
    });
  });

  it("reemplaza el comprobante si se sube uno nuevo", async () => {
    mockFindUnique.mockResolvedValueOnce(PAGADO);
    const pdf = new File([new Uint8Array([37, 80])], "nuevo.pdf", { type: "application/pdf" });
    await PATCH(makeRequest({ ...CAMPOS, comprobante: pdf }), params);
    expect(mockTx.movimiento.update.mock.calls[0][0].data.comprobanteUrl).toBe("pagos/u1/nuevo.pdf");
  });

  it("500 si falla la subida del comprobante", async () => {
    mockUpload.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pdf = new File([new Uint8Array([37, 80])], "nuevo.pdf", { type: "application/pdf" });
    expect((await PATCH(makeRequest({ ...CAMPOS, comprobante: pdf }), params)).status).toBe(500);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("pagado → pendiente: borra el movimiento; la cuota queda pendiente", async () => {
    mockFindUnique.mockResolvedValueOnce(PAGADO);
    await PATCH(makeRequest({ ...CAMPOS, estado: "pendiente", fecha: "2099-01-01", descripcion: "" }), params);
    expect(mockTx.movimiento.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(mockTx.cuota.update.mock.calls[0][0].data).toMatchObject({ descripcion: "Fábrica", estado: "pendiente" });
  });

  it("pendiente → pendiente: no toca movimientos", async () => {
    await PATCH(makeRequest({ ...CAMPOS, estado: "pendiente" }), params);
    expect(mockTx.movimiento.create).not.toHaveBeenCalled();
    expect(mockTx.movimiento.update).not.toHaveBeenCalled();
    expect(mockTx.movimiento.delete).not.toHaveBeenCalled();
  });

  it("crea la cuota si el acuerdo no tenía ninguna", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...PENDIENTE, cuotas: [] });
    await PATCH(makeRequest(), params);
    expect(mockTx.cuota.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acuerdoId: "p1", importe: 21000 }),
      select: { id: true },
    });
    expect(mockTx.movimiento.create.mock.calls[0][0].data.cuotaId).toBe("q-nueva");
  });

  it("400 si el pago actual o la nueva fecha caen en un período cerrado", async () => {
    mockFindUnique.mockResolvedValueOnce(PAGADO);
    mockPeriodoCerrado.mockResolvedValueOnce(true);
    expect((await PATCH(makeRequest(), params)).status).toBe(400);

    mockPeriodoCerrado.mockResolvedValueOnce(true);
    const res = await PATCH(makeRequest(), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/período ya está cerrado/);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
