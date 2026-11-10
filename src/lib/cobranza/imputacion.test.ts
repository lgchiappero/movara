import { describe, it, expect } from "vitest";
import { imputarCuotas, inicioDelDia } from "./imputacion";

const AHORA = new Date(2026, 10, 10, 15, 30); // 10/11/2026 15:30
const VENCIDA = new Date(2026, 9, 15); // 15/10/2026
const FUTURA = new Date(2026, 11, 15); // 15/12/2026
const cuota = (id: string, importe: number, vencimiento: Date | string | null = null, createdAt?: Date) => ({
  id,
  importe,
  vencimiento,
  createdAt,
});

describe("imputarCuotas", () => {
  it("pago total con cuota: la cuota queda pagada, sin saldo y sin alerta", () => {
    const [c] = imputarCuotas([cuota("c1", 15000, VENCIDA)], [{ cuotaId: "c1", importe: 15000 }], AHORA);
    expect(c).toEqual({ id: "c1", importe: 15000, pagado: 15000, restante: 0, estado: "pagado", vencida: false });
  });

  it("pago total SIN cuota específica: igual salda la cuota vencida (el caso del bug)", () => {
    const [c1, c2] = imputarCuotas(
      [cuota("c1", 15000, VENCIDA), cuota("c2", 15000, FUTURA)],
      [{ cuotaId: null, importe: 15000 }],
      AHORA
    );
    expect(c1).toMatchObject({ estado: "pagado", restante: 0, vencida: false });
    expect(c2).toMatchObject({ estado: "pendiente", restante: 15000, pagado: 0 });
  });

  it("pago parcial: reduce el saldo y la cuota vencida sigue vencida con lo que resta", () => {
    const [c] = imputarCuotas([cuota("c1", 15000, VENCIDA)], [{ cuotaId: "c1", importe: 5000 }], AHORA);
    expect(c).toMatchObject({ pagado: 5000, restante: 10000, estado: "vencido", vencida: true });
  });

  it("pago parcial de una cuota no vencida: pendiente con saldo", () => {
    const [c] = imputarCuotas([cuota("c1", 1000, FUTURA)], [{ cuotaId: null, importe: 400 }], AHORA);
    expect(c).toMatchObject({ pagado: 400, restante: 600, estado: "pendiente", vencida: false });
  });

  it("borrar el pago (sin movimientos): la cuota vuelve a vencida con el saldo completo", () => {
    const [c] = imputarCuotas([cuota("c1", 15000, VENCIDA)], [], AHORA);
    expect(c).toMatchObject({ pagado: 0, restante: 15000, estado: "vencido", vencida: true });
  });

  it("el saldo libre va de la que vence antes a la que vence después; sin vencimiento al final", () => {
    const r = imputarCuotas(
      [cuota("sin", 100, null), cuota("dic", 100, FUTURA), cuota("oct", 100, VENCIDA)],
      [{ cuotaId: null, importe: 150 }],
      AHORA
    );
    expect(r.map((c) => [c.id, c.pagado])).toEqual([
      ["sin", 0],
      ["dic", 50],
      ["oct", 100],
    ]);
  });

  it("lo pagado de más en una cuota pasa a la siguiente", () => {
    const [a, b] = imputarCuotas(
      [cuota("a", 100, VENCIDA), cuota("b", 100, FUTURA)],
      [{ cuotaId: "a", importe: 150 }],
      AHORA
    );
    expect(a).toMatchObject({ pagado: 100, estado: "pagado" });
    expect(b).toMatchObject({ pagado: 50, restante: 50 });
  });

  it("un movimiento con cuotaId de otro plan se trata como pago sin cuota", () => {
    const [c] = imputarCuotas([cuota("c1", 100, VENCIDA)], [{ cuotaId: "otra", importe: 100 }], AHORA);
    expect(c.estado).toBe("pagado");
  });

  it("los pagos imputados a una cuota no saldan otra si no sobran", () => {
    const [a, b] = imputarCuotas(
      [cuota("a", 100, VENCIDA), cuota("b", 100, VENCIDA)],
      [{ cuotaId: "b", importe: 100 }],
      AHORA
    );
    expect(a).toMatchObject({ estado: "vencido", restante: 100 });
    expect(b).toMatchObject({ estado: "pagado" });
  });

  it("tolera errores de redondeo (0,1 + 0,2 cubre 0,3)", () => {
    const [c] = imputarCuotas([cuota("c1", 0.3, VENCIDA)], [{ cuotaId: "c1", importe: 0.1 }, { cuotaId: null, importe: 0.2 }], AHORA);
    expect(c).toMatchObject({ restante: 0, estado: "pagado" });
  });

  it("vencida desde el día siguiente al vencimiento: la que vence hoy todavía no", () => {
    const [hoy, ayer] = imputarCuotas(
      [cuota("hoy", 100, new Date(2026, 10, 10)), cuota("ayer", 100, new Date(2026, 10, 9))],
      [],
      AHORA
    );
    expect(hoy).toMatchObject({ estado: "pendiente", vencida: false });
    expect(ayer).toMatchObject({ estado: "vencido", vencida: true });
  });

  it("acepta vencimientos como string ISO y desempata por fecha de alta y por id", () => {
    const r = imputarCuotas(
      [
        cuota("z", 100, "2026-10-15", new Date(2)),
        cuota("y", 100, "2026-10-15", new Date(1)),
        cuota("b", 100, "2026-10-15", new Date(1)),
      ],
      [{ cuotaId: null, importe: 150 }],
      AHORA
    );
    expect(r.map((c) => [c.id, c.pagado])).toEqual([
      ["z", 0],
      ["y", 50],
      ["b", 100],
    ]);
  });

  it("vencimiento inválido se trata como sin vencimiento (nunca vencida)", () => {
    const [c] = imputarCuotas([cuota("c1", 100, "no-es-fecha")], [], AHORA);
    expect(c).toMatchObject({ estado: "pendiente", vencida: false });
  });

  it("sin cuotas: lista vacía (los pagos no imputables no rompen)", () => {
    expect(imputarCuotas([], [{ cuotaId: null, importe: 100 }], AHORA)).toEqual([]);
  });
});

describe("inicioDelDia", () => {
  it("las 00:00 del mismo día", () => {
    expect(inicioDelDia(AHORA)).toEqual(new Date(2026, 10, 10));
  });
});
