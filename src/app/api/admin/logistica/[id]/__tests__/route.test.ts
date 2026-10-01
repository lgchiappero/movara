// @vitest-environment node
//
// jsdom trae su propio File/FormData, distintos de los que usa
// NextRequest.formData() — mismo criterio que los otros routes con upload.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUnique, mockDelete, mockTransaction, mockTx, mockPeriodoCerrado, mockUpload } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockDelete: vi.fn(),
  mockTransaction: vi.fn(),
  mockTx: {
    costoLogistica: { update: vi.fn() },
    prorrateoLogistica: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
  mockPeriodoCerrado: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { costoLogistica: { findUnique: mockFindUnique, delete: mockDelete }, $transaction: mockTransaction },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/cobranza/periodo-cerrado", () => ({ periodoEstaCerrado: mockPeriodoCerrado }));
vi.mock("@/lib/admin/storage", () => ({
  buildStoragePath: (scope: string, id: string, name: string) => `${scope}/${id}/${name}`,
  uploadDocument: mockUpload,
  BUCKET_MOVARA: "documentos-movara",
}));

import { PATCH, DELETE } from "../route";
import { NextRequest } from "next/server";

const ADMIN = { email: "a@x.com", rol: "admin" };
const params = { params: Promise.resolve({ id: "c1" }) };
const CAMPOS = {
  concepto: "aduana",
  descripcion: "",
  moneda: "ARS",
  importe: "90000",
  fecha: "2026-10-01",
  estado: "pagado",
  notas: "Liquidación",
  prorratear: "true",
};
const COSTO = {
  id: "c1",
  envioId: "e1",
  fecha: new Date("2026-09-10"),
  estado: "pendiente",
  comprobanteUrl: null,
  envio: { unidades: [{ id: "u1" }, { id: "u2" }] },
};

function patch(campos: Record<string, string | File> = CAMPOS): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.set(k, v);
  return new NextRequest("http://localhost/api/admin/logistica/c1", { method: "PATCH", body: form });
}
const del = () => new NextRequest("http://localhost/api/admin/logistica/c1", { method: "DELETE" });

describe("PATCH /api/admin/logistica/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockReset();
    mockGetAdminUser.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue(COSTO);
    mockPeriodoCerrado.mockResolvedValue(false);
    mockUpload.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx));
  });

  it("401 sin sesión; 400 sin formulario o con datos inválidos; 404 si no existe", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await PATCH(patch(), params)).status).toBe(401);
    expect((await PATCH(new NextRequest("http://localhost/x", { method: "PATCH", body: "x" }), params)).status).toBe(400);
    expect((await PATCH(patch({ ...CAMPOS, concepto: "otro-invalido" }), params)).status).toBe(400);
    mockFindUnique.mockResolvedValueOnce(null);
    expect((await PATCH(patch(), params)).status).toBe(404);
  });

  it("actualiza el costo y recalcula el prorrateo con las unidades actuales del envío", async () => {
    expect((await PATCH(patch(), params)).status).toBe(200);
    expect(mockTx.costoLogistica.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        concepto: "aduana",
        descripcion: null,
        moneda: "ARS",
        importe: 90000,
        fecha: new Date("2026-10-01"),
        estado: "pagado",
        comprobanteUrl: null,
        notas: "Liquidación",
        prorrateado: true,
      },
    });
    expect(mockTx.prorrateoLogistica.deleteMany).toHaveBeenCalledWith({ where: { costoId: "c1" } });
    expect(mockTx.prorrateoLogistica.createMany).toHaveBeenCalledWith({
      data: [
        { costoId: "c1", unidadId: "u1", importe: 45000 },
        { costoId: "c1", unidadId: "u2", importe: 45000 },
      ],
    });
  });

  it("desmarcar el prorrateo borra los registros por unidad", async () => {
    await PATCH(patch({ ...CAMPOS, prorratear: "false" }), params);
    expect(mockTx.prorrateoLogistica.deleteMany).toHaveBeenCalled();
    expect(mockTx.prorrateoLogistica.createMany).not.toHaveBeenCalled();
  });

  it("400 si se pide prorratear y el envío no tiene unidades", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...COSTO, envio: { unidades: [] } });
    expect((await PATCH(patch(), params)).status).toBe(400);
  });

  it("conserva el comprobante si sigue pagado; pasar a pendiente lo quita; uno nuevo lo reemplaza", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...COSTO, estado: "pagado", comprobanteUrl: "logistica/e1/viejo.pdf" });
    await PATCH(patch(), params);
    expect(mockTx.costoLogistica.update.mock.calls[0][0].data.comprobanteUrl).toBe("logistica/e1/viejo.pdf");

    mockFindUnique.mockResolvedValueOnce({ ...COSTO, estado: "pagado", comprobanteUrl: "logistica/e1/viejo.pdf" });
    await PATCH(patch({ ...CAMPOS, estado: "pendiente" }), params);
    expect(mockTx.costoLogistica.update.mock.calls[1][0].data.comprobanteUrl).toBeNull();

    const pdf = new File([new Uint8Array([37, 80])], "nuevo.pdf", { type: "application/pdf" });
    await PATCH(patch({ ...CAMPOS, comprobante: pdf }), params);
    expect(mockTx.costoLogistica.update.mock.calls[2][0].data.comprobanteUrl).toBe("logistica/e1/nuevo.pdf");
  });

  it("500 si falla la subida del comprobante", async () => {
    mockUpload.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pdf = new File([new Uint8Array([37, 80])], "nuevo.pdf", { type: "application/pdf" });
    expect((await PATCH(patch({ ...CAMPOS, comprobante: pdf }), params)).status).toBe(500);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("400 si el pago actual o el nuevo caen en un período cerrado", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...COSTO, estado: "pagado" });
    mockPeriodoCerrado.mockResolvedValueOnce(true);
    expect((await PATCH(patch(), params)).status).toBe(400);
    mockPeriodoCerrado.mockResolvedValueOnce(true);
    expect((await PATCH(patch(), params)).status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/logistica/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockReset();
    mockGetAdminUser.mockResolvedValue(ADMIN);
    mockPeriodoCerrado.mockResolvedValue(false);
  });

  it("401 sin sesión; 403 si no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await DELETE(del(), params)).status).toBe(401);
    mockGetAdminUser.mockResolvedValueOnce({ ...ADMIN, rol: "vendedor" });
    expect((await DELETE(del(), params)).status).toBe(403);
  });

  it("404 si no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect((await DELETE(del(), params)).status).toBe(404);
  });

  it("elimina (el prorrateo cae en cascada)", async () => {
    mockFindUnique.mockResolvedValueOnce({ fecha: new Date("2026-09-10"), estado: "pagado" });
    expect((await DELETE(del(), params)).status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("un pendiente se borra sin chequear período; un pagado de un período cerrado no", async () => {
    mockFindUnique.mockResolvedValueOnce({ fecha: new Date("2020-01-01"), estado: "pendiente" });
    expect((await DELETE(del(), params)).status).toBe(200);
    expect(mockPeriodoCerrado).not.toHaveBeenCalled();
    mockFindUnique.mockResolvedValueOnce({ fecha: new Date("2026-08-01"), estado: "pagado" });
    mockPeriodoCerrado.mockResolvedValueOnce(true);
    const res = await DELETE(del(), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/período ya cerrado/);
  });
});
