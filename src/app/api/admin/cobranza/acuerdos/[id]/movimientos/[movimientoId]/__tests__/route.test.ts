// @vitest-environment node
//
// jsdom trae su propio File/FormData globals, distintos de los que usa
// NextRequest.formData() internamente — mismo criterio que en el resto de
// los routes con upload de archivos.
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAdminUser,
  mockFindUniqueMovimiento,
  mockUpdateMovimiento,
  mockDeleteMovimiento,
  mockFindUniqueCuota,
  mockUpdateCuota,
  mockFindManyMovimiento,
  mockFindUniqueCierre,
  mockUploadDocument,
} = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUniqueMovimiento: vi.fn(),
  mockUpdateMovimiento: vi.fn(),
  mockDeleteMovimiento: vi.fn(),
  mockFindUniqueCuota: vi.fn(),
  mockUpdateCuota: vi.fn(),
  mockFindManyMovimiento: vi.fn(),
  mockFindUniqueCierre: vi.fn(),
  mockUploadDocument: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    movimiento: { findUnique: mockFindUniqueMovimiento, update: mockUpdateMovimiento, delete: mockDeleteMovimiento, findMany: mockFindManyMovimiento },
    cuota: { findUnique: mockFindUniqueCuota, update: mockUpdateCuota },
    cierrePeriodo: { findUnique: mockFindUniqueCierre },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/admin/storage", () => ({
  buildStoragePath: (scope: string, id: string, filename: string) => `${scope}/${id}/${filename}`,
  uploadDocument: mockUploadDocument,
  BUCKET_MOVARA: "documentos-movara",
}));

import { PATCH, DELETE } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

const MOVIMIENTO = {
  id: "m1",
  acuerdoId: "a1",
  cuotaId: null,
  fecha: new Date("2026-06-10"),
  importe: 100,
  modalidad: "transferencia",
  comprobanteUrl: null,
  notas: null,
  registradoPor: "a@x.com",
};

function makeFormRequest(fields: Record<string, string | File>, method = "PATCH"): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1/movimientos/m1", {
    method,
    body: form,
  });
}

function pdfFile(name = "comprobante.pdf"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });
}

describe("PATCH /api/admin/cobranza/acuerdos/[id]/movimientos/[movimientoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUniqueMovimiento.mockResolvedValue({ ...MOVIMIENTO });
    mockFindUniqueCierre.mockResolvedValue(null);
    mockUpdateMovimiento.mockResolvedValue({ id: "m1" });
    mockFindManyMovimiento.mockResolvedValue([]);
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await PATCH(makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "m1" }),
    });
    expect(res.status).toBe(401);
  });

  it("404 si el pago no existe", async () => {
    mockFindUniqueMovimiento.mockResolvedValueOnce(null);
    const res = await PATCH(makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "no-existe" }),
    });
    expect(res.status).toBe(404);
  });

  it("404 si el pago pertenece a otro acuerdo", async () => {
    mockFindUniqueMovimiento.mockResolvedValueOnce({ ...MOVIMIENTO, acuerdoId: "otro-acuerdo" });
    const res = await PATCH(makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "m1" }),
    });
    expect(res.status).toBe(404);
  });

  it("400 si el pago ya está en un período cerrado (aunque la fecha nueva no cambie)", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce({ id: "c1", mes: 6, anio: 2026 });
    const res = await PATCH(makeFormRequest({ fecha: "2026-06-10", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "m1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdateMovimiento).not.toHaveBeenCalled();
  });

  it("400 si se intenta mover el pago a un período ya cerrado", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce(null); // el mes actual del pago no está cerrado
    mockFindUniqueCierre.mockResolvedValueOnce({ id: "c1", mes: 1, anio: 2026 }); // el mes destino sí
    const res = await PATCH(makeFormRequest({ fecha: "2026-01-15", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "m1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdateMovimiento).not.toHaveBeenCalled();
  });

  it("400 si el importe no es positivo", async () => {
    const res = await PATCH(makeFormRequest({ fecha: "2026-06-11", importe: "0", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "m1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 si la nueva cuota no pertenece a este acuerdo", async () => {
    mockFindUniqueCuota.mockResolvedValueOnce({ id: "c1", acuerdoId: "otro-acuerdo", importe: 100, estado: "pendiente", vencimiento: null });
    const res = await PATCH(
      makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo", cuotaId: "c1" }),
      { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("200 y actualiza fecha/importe/modalidad/notas", async () => {
    const res = await PATCH(
      makeFormRequest({ fecha: "2026-06-11", importe: "250", modalidad: "efectivo", notas: "corregido" }),
      { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) }
    );
    expect(res.status).toBe(200);
    expect(mockUpdateMovimiento).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({ importe: 250, modalidad: "efectivo", notas: "corregido", cuotaId: null }),
    });
  });

  it("conserva el comprobante existente si no se sube uno nuevo", async () => {
    mockFindUniqueMovimiento.mockResolvedValueOnce({ ...MOVIMIENTO, comprobanteUrl: "cobranza/a1/viejo.pdf" });
    await PATCH(makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "m1" }),
    });
    expect(mockUpdateMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comprobanteUrl: "cobranza/a1/viejo.pdf" }) })
    );
  });

  it("reemplaza el comprobante cuando se sube un archivo nuevo", async () => {
    await PATCH(
      makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo", comprobante: pdfFile() }),
      { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) }
    );
    expect(mockUploadDocument).toHaveBeenCalled();
    expect(mockUpdateMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comprobanteUrl: "cobranza/a1/comprobante.pdf" }) })
    );
  });

  it("400 si el comprobante nuevo no pasa la validación", async () => {
    const badFile = new File([new Uint8Array([1])], "virus.exe", { type: "application/x-msdownload" });
    const res = await PATCH(
      makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo", comprobante: badFile }),
      { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("400 si el formData no se puede parsear", async () => {
    const req = new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1/movimientos/m1", {
      method: "PATCH",
      body: "no-es-form-data",
      headers: { "content-type": "multipart/form-data" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) });
    expect(res.status).toBe(400);
  });

  it("500 si Storage falla al subir el comprobante nuevo", async () => {
    mockUploadDocument.mockRejectedValueOnce(new Error("boom"));
    const res = await PATCH(
      makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo", comprobante: pdfFile() }),
      { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) }
    );
    expect(res.status).toBe(500);
  });

  it("recalcula la cuota anterior cuando se quita la asociación", async () => {
    mockFindUniqueMovimiento.mockResolvedValueOnce({ ...MOVIMIENTO, cuotaId: "c-vieja" });
    mockFindUniqueCuota.mockResolvedValueOnce({ id: "c-vieja", importe: 100, estado: "pagado", vencimiento: null });
    mockFindManyMovimiento.mockResolvedValueOnce([]); // sin más movimientos para c-vieja tras el update
    await PATCH(makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo" }), {
      params: Promise.resolve({ id: "a1", movimientoId: "m1" }),
    });
    expect(mockFindUniqueCuota).toHaveBeenCalledWith({ where: { id: "c-vieja" } });
    expect(mockUpdateCuota).toHaveBeenCalledWith({ where: { id: "c-vieja" }, data: { estado: "pendiente" } });
  });

  it("recalcula la nueva cuota asociada usando los datos ya resueltos (sin refetch extra)", async () => {
    mockFindUniqueCuota.mockResolvedValueOnce({ id: "c-nueva", acuerdoId: "a1", importe: 100, estado: "pendiente", vencimiento: null });
    mockFindManyMovimiento.mockResolvedValueOnce([{ importe: 100 }]);
    await PATCH(
      makeFormRequest({ fecha: "2026-06-11", importe: "100", modalidad: "efectivo", cuotaId: "c-nueva" }),
      { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) }
    );
    expect(mockUpdateCuota).toHaveBeenCalledWith({ where: { id: "c-nueva" }, data: { estado: "pagado" } });
    // La cuota nueva ya se había resuelto al validar cuotaId -> no se vuelve a pedir con findUnique.
    expect(mockFindUniqueCuota).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/admin/cobranza/acuerdos/[id]/movimientos/[movimientoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUniqueMovimiento.mockResolvedValue({ ...MOVIMIENTO });
    mockFindUniqueCierre.mockResolvedValue(null);
    mockDeleteMovimiento.mockResolvedValue({ id: "m1" });
    mockFindManyMovimiento.mockResolvedValue([]);
  });

  function makeDeleteRequest(): NextRequest {
    return new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1/movimientos/m1", { method: "DELETE" });
  }

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) });
    expect(res.status).toBe(401);
  });

  it("404 si el pago no existe o pertenece a otro acuerdo", async () => {
    mockFindUniqueMovimiento.mockResolvedValueOnce({ ...MOVIMIENTO, acuerdoId: "otro" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) });
    expect(res.status).toBe(404);
  });

  it("400 si el período del pago ya está cerrado", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce({ id: "c1", mes: 6, anio: 2026 });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) });
    expect(res.status).toBe(400);
    expect(mockDeleteMovimiento).not.toHaveBeenCalled();
  });

  it("200 y borra el pago sin cuota asociada (sin recalcular nada)", async () => {
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) });
    expect(res.status).toBe(200);
    expect(mockDeleteMovimiento).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(mockFindUniqueCuota).not.toHaveBeenCalled();
  });

  it("recalcula el estado de la cuota asociada tras borrar", async () => {
    mockFindUniqueMovimiento.mockResolvedValueOnce({ ...MOVIMIENTO, cuotaId: "c1" });
    mockFindUniqueCuota.mockResolvedValueOnce({ id: "c1", importe: 100, estado: "pagado", vencimiento: null });
    mockFindManyMovimiento.mockResolvedValueOnce([]); // sin movimientos restantes tras el borrado
    await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "a1", movimientoId: "m1" }) });
    expect(mockUpdateCuota).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "pendiente" } });
  });
});
