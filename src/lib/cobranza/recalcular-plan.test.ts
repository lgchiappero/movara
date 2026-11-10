import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { recalcularEstadosPlan } from "./recalcular-plan";

const AHORA = new Date(2026, 10, 10);

function fakeTx(
  cuotas: { id: string; importe: number; vencimiento: Date | null; createdAt: Date; estado: string }[],
  movimientos: { cuotaId: string | null; importe: number }[]
) {
  const update = vi.fn().mockResolvedValue({});
  const tx = {
    cuota: { findMany: vi.fn().mockResolvedValue(cuotas), update },
    movimiento: { findMany: vi.fn().mockResolvedValue(movimientos) },
  } as unknown as Prisma.TransactionClient;
  return { tx, update };
}

const cuota = (id: string, importe: number, estado: string, vencimiento: Date | null = new Date(2026, 9, 15)) => ({
  id,
  importe,
  vencimiento,
  createdAt: new Date(0),
  estado,
});

describe("recalcularEstadosPlan", () => {
  it("pago total sin cuota específica: persiste 'pagado' en la cuota vencida", async () => {
    const { tx, update } = fakeTx([cuota("c1", 15000, "vencido")], [{ cuotaId: null, importe: 15000 }]);
    await recalcularEstadosPlan(tx, "a1", AHORA);
    expect(tx.cuota.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { acuerdoId: "a1" } }));
    expect(tx.movimiento.findMany).toHaveBeenCalledWith({ where: { acuerdoId: "a1" }, select: { cuotaId: true, importe: true } });
    expect(update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "pagado" } });
  });

  it("pago parcial: la cuota sigue con su estado y no se escribe nada", async () => {
    const { tx, update } = fakeTx([cuota("c1", 15000, "vencido")], [{ cuotaId: "c1", importe: 1000 }]);
    await recalcularEstadosPlan(tx, "a1", AHORA);
    expect(update).not.toHaveBeenCalled();
  });

  it("borrado del pago: la cuota 'pagado' vuelve a 'vencido' o 'pendiente' según su vencimiento", async () => {
    const { tx, update } = fakeTx(
      [cuota("c1", 100, "pagado"), cuota("c2", 100, "pagado", new Date(2026, 11, 1))],
      []
    );
    await recalcularEstadosPlan(tx, "a1", AHORA);
    expect(update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "vencido" } });
    expect(update).toHaveBeenCalledWith({ where: { id: "c2" }, data: { estado: "pendiente" } });
  });

  it("sin fecha usa la de hoy", async () => {
    const { tx, update } = fakeTx([cuota("c1", 100, "pendiente", null)], [{ cuotaId: null, importe: 100 }]);
    await recalcularEstadosPlan(tx, "a1");
    expect(update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "pagado" } });
  });
});
