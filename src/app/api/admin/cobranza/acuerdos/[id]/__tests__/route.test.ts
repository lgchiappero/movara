import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindUnique,
  mockDelete,
  mockGetAdminUser,
  mockPeriodoCerrado,
  mockTransaction,
  mockTxUpdateAcuerdo,
  mockTxDeleteMany,
  mockTxUpdateCuota,
  mockTxCreateCuota,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockDelete: vi.fn(),
  mockGetAdminUser: vi.fn(),
  mockPeriodoCerrado: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxUpdateAcuerdo: vi.fn(),
  mockTxDeleteMany: vi.fn(),
  mockTxUpdateCuota: vi.fn(),
  mockTxCreateCuota: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { acuerdoPago: { findUnique: mockFindUnique, delete: mockDelete }, $transaction: mockTransaction },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/cobranza/periodo-cerrado", () => ({ periodoEstaCerrado: mockPeriodoCerrado }));

import { DELETE, PATCH } from "../route";
import { NextRequest } from "next/server";

const ADMIN = { id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" };
const params = { params: Promise.resolve({ id: "a1" }) };

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1", { method: "DELETE" });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/acuerdos/a1", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("DELETE /api/admin/cobranza/acuerdos/[id] — elimina el plan completo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPeriodoCerrado.mockResolvedValue(false);
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), params);
    expect(res.status).toBe(401);
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ ...ADMIN, rol: "vendedor" });
    const res = await DELETE(makeDeleteRequest(), params);
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("404 si el plan no existe", async () => {
    mockGetAdminUser.mockResolvedValueOnce(ADMIN);
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), params);
    expect(res.status).toBe(404);
  });

  it("elimina el plan aunque tenga pagos registrados (cuotas y pagos caen en cascada)", async () => {
    mockGetAdminUser.mockResolvedValueOnce(ADMIN);
    mockFindUnique.mockResolvedValueOnce({ id: "a1", movimientos: [{ fecha: new Date("2026-09-01") }, { fecha: new Date("2026-09-20") }] });
    const res = await DELETE(makeDeleteRequest(), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, pagosEliminados: 2 });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("elimina un plan sin pagos", async () => {
    mockGetAdminUser.mockResolvedValueOnce(ADMIN);
    mockFindUnique.mockResolvedValueOnce({ id: "a1", movimientos: [] });
    const res = await DELETE(makeDeleteRequest(), params);
    expect(res.status).toBe(200);
    expect(mockPeriodoCerrado).not.toHaveBeenCalled();
  });

  it("400 si algún pago cae en un período cerrado — no borra nada", async () => {
    mockGetAdminUser.mockResolvedValueOnce(ADMIN);
    mockFindUnique.mockResolvedValueOnce({ id: "a1", movimientos: [{ fecha: new Date("2026-08-01") }] });
    mockPeriodoCerrado.mockResolvedValueOnce(true);
    const res = await DELETE(makeDeleteRequest(), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/período ya cerrado/);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/cobranza/acuerdos/[id] — editar plan", () => {
  // Plan: q1 Anticipo (con 7410 pagados), q2 Cuota 1/2 y q3 Cuota 2/2 sin pagos.
  const PLAN = {
    id: "a1",
    cuotas: [
      { id: "q1", descripcion: "Anticipo", movimientos: [{ importe: 7410 }] },
      { id: "q2", descripcion: "Cuota 1/2", movimientos: [] },
      { id: "q3", descripcion: "Cuota 2/2", movimientos: [] },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue(PLAN);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        acuerdoPago: { update: mockTxUpdateAcuerdo },
        cuota: { deleteMany: mockTxDeleteMany, update: mockTxUpdateCuota, create: mockTxCreateCuota },
      })
    );
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await PATCH(makePatch({}), params);
    expect(res.status).toBe(401);
  });

  it("400 con body inválido o suma de cuotas distinta del total", async () => {
    expect((await PATCH(makePatch("no-json"), params)).status).toBe(400);
    const res = await PATCH(
      makePatch({ totalAcordado: 1000, cuotas: [{ id: "q1", descripcion: "Anticipo", importe: 7410 }] }),
      params
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/debe coincidir con el total acordado/);
  });

  it("404 si el plan no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makePatch({ totalAcordado: 100, cuotas: [{ descripcion: "Saldo", importe: 100 }] }), params);
    expect(res.status).toBe(404);
  });

  it("cambia el total, actualiza cuotas existentes, agrega nuevas y elimina las que no tienen pagos", async () => {
    const res = await PATCH(
      makePatch({
        totalAcordado: 26000,
        descripcion: "Plan renegociado",
        cuotas: [
          { id: "q1", descripcion: "Anticipo", importe: 7410, vencimiento: null },
          { id: "q2", descripcion: "Cuota 1/2", importe: 9000, vencimiento: "2026-12-01" },
          // q3 no viene → se elimina (no tiene pagos)
          { descripcion: "Saldo", importe: 9590, vencimiento: null },
        ],
      }),
      params
    );
    expect(res.status).toBe(200);
    expect(mockTxUpdateAcuerdo).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { totalAcordado: 26000, descripcion: "Plan renegociado" },
    });
    expect(mockTxDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ["q3"] } } });
    // q1 está saldada por sus pagos → queda "pagado"; q2 sin pagos → pendiente.
    expect(mockTxUpdateCuota).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { descripcion: "Anticipo", importe: 7410, vencimiento: null, estado: "pagado" },
    });
    expect(mockTxUpdateCuota).toHaveBeenCalledWith({
      where: { id: "q2" },
      data: { descripcion: "Cuota 1/2", importe: 9000, vencimiento: new Date("2026-12-01"), estado: "pendiente" },
    });
    expect(mockTxCreateCuota).toHaveBeenCalledWith({
      data: { acuerdoId: "a1", descripcion: "Saldo", importe: 9590, vencimiento: null, estado: "pendiente" },
    });
  });

  it("sin descripción en el body no la toca; sin cuotas a eliminar no llama deleteMany", async () => {
    const res = await PATCH(
      makePatch({
        totalAcordado: 17410,
        cuotas: [
          { id: "q1", descripcion: "Anticipo", importe: 7410 },
          { id: "q2", descripcion: "Cuota 1/2", importe: 5000 },
          { id: "q3", descripcion: "Cuota 2/2", importe: 5000 },
        ],
      }),
      params
    );
    expect(res.status).toBe(200);
    expect(mockTxUpdateAcuerdo).toHaveBeenCalledWith({ where: { id: "a1" }, data: { totalAcordado: 17410 } });
    expect(mockTxDeleteMany).not.toHaveBeenCalled();
  });

  it("400 si se intenta eliminar una cuota con pagos registrados", async () => {
    const res = await PATCH(
      makePatch({
        totalAcordado: 10000,
        cuotas: [
          { id: "q2", descripcion: "Cuota 1/2", importe: 5000 },
          { id: "q3", descripcion: "Cuota 2/2", importe: 5000 },
        ],
      }),
      params
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('No se puede eliminar la cuota "Anticipo": tiene pagos registrados');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("400 si se baja el importe de una cuota por debajo de lo ya pagado", async () => {
    const res = await PATCH(
      makePatch({
        totalAcordado: 7000,
        cuotas: [
          { id: "q1", descripcion: "Anticipo", importe: 5000 },
          { id: "q2", descripcion: "Cuota 1/2", importe: 1000 },
          { id: "q3", descripcion: "Cuota 2/2", importe: 1000 },
        ],
      }),
      params
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no puede ser menor a lo ya pagado/);
  });

  it("400 si una cuota no pertenece al plan", async () => {
    const res = await PATCH(
      makePatch({ totalAcordado: 100, cuotas: [{ id: "otra", descripcion: "X", importe: 100 }] }),
      params
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no pertenece a este plan/);
  });
});
