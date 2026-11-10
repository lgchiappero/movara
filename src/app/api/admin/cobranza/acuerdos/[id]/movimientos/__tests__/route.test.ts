// @vitest-environment node
//
// jsdom trae su propio File/FormData globals, distintos de los que usa
// NextRequest.formData() internamente — mismo criterio que ya se usa en
// otros routes con upload de archivos (ver configuraciones/[id]/documentos).
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAdminUser,
  mockFindUniqueAcuerdo,
  mockFindUniqueCuota,
  mockCreateMovimiento,
  mockFindManyMovimiento,
  mockUpdateCuota,
  mockUploadDocument,
  mockFindUniqueCierre,
  mockFindManyCuota,
} = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUniqueAcuerdo: vi.fn(),
  mockFindUniqueCuota: vi.fn(),
  mockCreateMovimiento: vi.fn(),
  mockFindManyMovimiento: vi.fn(),
  mockUpdateCuota: vi.fn(),
  mockUploadDocument: vi.fn().mockResolvedValue(undefined),
  mockFindUniqueCierre: vi.fn(),
  mockFindManyCuota: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    acuerdoPago: { findUnique: mockFindUniqueAcuerdo },
    cuota: { findUnique: mockFindUniqueCuota, update: mockUpdateCuota },
    movimiento: { create: mockCreateMovimiento, findMany: mockFindManyMovimiento },
    cierrePeriodo: { findUnique: mockFindUniqueCierre },
    // El movimiento y el recálculo de las cuotas corren en una transacción
    // (recalcularEstadosPlan real, sobre este mismo tx).
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        movimiento: { create: mockCreateMovimiento, findMany: mockFindManyMovimiento },
        cuota: { findMany: mockFindManyCuota, update: mockUpdateCuota },
      }),
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
const { mockInfoArchivo, mockEliminarArchivo } = vi.hoisted(() => ({
  mockInfoArchivo: vi.fn(),
  mockEliminarArchivo: vi.fn(),
}));
vi.mock("@/lib/admin/storage", () => ({
  buildStoragePath: (scope: string, id: string, filename: string) => `${scope}/${id}/${filename}`,
  uploadDocument: mockUploadDocument,
  BUCKET_MOVARA: "documentos-movara",
  BUCKET_PEDIDOS: "documentos-pedidos",
  crearUrlSubida: vi.fn(),
  infoArchivo: mockInfoArchivo,
  eliminarArchivo: mockEliminarArchivo,
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

function makeFormRequest(fields: Record<string, string | File>): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1/movimientos", {
    method: "POST",
    body: form,
  });
}

function pdfFile(name = "comprobante.pdf"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });
}

describe("POST /api/admin/cobranza/acuerdos/[id]/movimientos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUniqueAcuerdo.mockResolvedValue({ id: "a1", tipo: "cobro" });
    mockCreateMovimiento.mockResolvedValue({ id: "m1" });
    mockFindManyMovimiento.mockResolvedValue([]);
    mockFindUniqueCierre.mockResolvedValue(null);
    mockFindManyCuota.mockResolvedValue([]);
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await POST(makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "transferencia" }), {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(res.status).toBe(401);
  });

  it("404 si el acuerdo no existe", async () => {
    mockFindUniqueAcuerdo.mockResolvedValueOnce(null);
    const res = await POST(makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "transferencia" }), {
      params: Promise.resolve({ id: "no-existe" }),
    });
    expect(res.status).toBe(404);
  });

  it("400 si el formData no se puede parsear", async () => {
    const req = new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1/movimientos", {
      method: "POST",
      body: "no-es-form-data",
      headers: { "content-type": "multipart/form-data" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "a1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si el período de la fecha del movimiento ya está cerrado", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce({ id: "c1", mes: 1, anio: 2026 });
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-15", importe: "100", modalidad: "transferencia" }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(400);
    expect(mockCreateMovimiento).not.toHaveBeenCalled();
  });

  it("consulta el cierre del mes/año correspondientes a la fecha del movimiento", async () => {
    await POST(makeFormRequest({ fecha: "2026-03-10", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(mockFindUniqueCierre).toHaveBeenCalledWith({ where: { mes_anio: { mes: 3, anio: 2026 } } });
  });

  it("400 si falta la fecha", async () => {
    const res = await POST(makeFormRequest({ importe: "100", modalidad: "transferencia" }), {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 si el importe no es un número positivo", async () => {
    const res = await POST(makeFormRequest({ fecha: "2026-01-01", importe: "0", modalidad: "transferencia" }), {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 con modalidad inválida", async () => {
    const res = await POST(makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "cheque" }), {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 si la cuota indicada no pertenece a este acuerdo", async () => {
    mockFindUniqueCuota.mockResolvedValueOnce({ id: "c1", acuerdoId: "otro-acuerdo", importe: 100, estado: "pendiente", vencimiento: null });
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "transferencia", cuotaId: "c1" }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("201 sin cuota asociada (pago parcial) ni comprobante", async () => {
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "efectivo" }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(201);
    expect(mockCreateMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acuerdoId: "a1",
          cuotaId: null,
          importe: 100,
          modalidad: "efectivo",
          registradoPor: "admin@movara.com.ar",
          comprobanteUrl: null,
        }),
      })
    );
  });

  it("sube el comprobante a Storage cuando se adjunta un archivo válido", async () => {
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "transferencia", comprobante: pdfFile() }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(201);
    expect(mockUploadDocument).toHaveBeenCalled();
    expect(mockCreateMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comprobanteUrl: "cobranza/a1/comprobante.pdf" }) })
    );
  });

  it("400 si el comprobante adjunto no pasa la validación de tipo/tamaño", async () => {
    const badFile = new File([new Uint8Array([1])], "virus.exe", { type: "application/x-msdownload" });
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "transferencia", comprobante: badFile }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("500 si Storage falla al subir el comprobante", async () => {
    mockUploadDocument.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "transferencia", comprobante: pdfFile() }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(500);
  });

  it("con cuotaId: si el pago salda la cuota, pasa a 'pagado' en la misma transacción", async () => {
    mockFindUniqueCuota.mockResolvedValueOnce({ acuerdoId: "a1" });
    mockFindManyCuota.mockResolvedValueOnce([
      { id: "c1", importe: 100, vencimiento: null, createdAt: new Date(0), estado: "pendiente" },
    ]);
    mockFindManyMovimiento.mockResolvedValueOnce([{ cuotaId: "c1", importe: 100 }]);
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "100", modalidad: "transferencia", cuotaId: "c1" }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(201);
    expect(mockFindManyMovimiento).toHaveBeenCalledWith({ where: { acuerdoId: "a1" }, select: { cuotaId: true, importe: true } });
    expect(mockUpdateCuota).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "pagado" } });
  });

  it("con cuotaId: un pago parcial deja la cuota como estaba y no la actualiza", async () => {
    mockFindUniqueCuota.mockResolvedValueOnce({ acuerdoId: "a1" });
    mockFindManyCuota.mockResolvedValueOnce([
      { id: "c1", importe: 100, vencimiento: null, createdAt: new Date(0), estado: "pendiente" },
    ]);
    mockFindManyMovimiento.mockResolvedValueOnce([{ cuotaId: "c1", importe: 40 }]);
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "40", modalidad: "transferencia", cuotaId: "c1" }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(201);
    expect(mockUpdateCuota).not.toHaveBeenCalled();
  });

  it("sin cuota específica: el pago salda la cuota vencida (el caso del bug del dashboard)", async () => {
    mockFindManyCuota.mockResolvedValueOnce([
      { id: "c1", importe: 15000, vencimiento: new Date("2026-01-10"), createdAt: new Date(0), estado: "vencido" },
      { id: "c2", importe: 15000, vencimiento: new Date("2099-01-10"), createdAt: new Date(1), estado: "pendiente" },
    ]);
    mockFindManyMovimiento.mockResolvedValueOnce([{ cuotaId: null, importe: 15000 }]);
    const res = await POST(
      makeFormRequest({ fecha: "2026-01-01", importe: "15000", modalidad: "transferencia" }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    expect(res.status).toBe(201);
    expect(mockUpdateCuota).toHaveBeenCalledTimes(1);
    expect(mockUpdateCuota).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "pagado" } });
  });

  it("si el recálculo falla, la transacción falla entera (el pago no queda a medias)", async () => {
    mockFindManyCuota.mockRejectedValueOnce(new Error("db caída"));
    await expect(
      POST(makeFormRequest({ fecha: "2026-01-01", importe: "10", modalidad: "transferencia" }), {
        params: Promise.resolve({ id: "a1" }),
      })
    ).rejects.toThrow("db caída");
  });
});
