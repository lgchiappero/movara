import { describe, it, expect } from "vitest";
import {
  resumenPlan,
  tipoDeCuota,
  cuotaVencida,
  filasPorUnidad,
  metricasPlanes,
  filtroEstadoDesdeQuery,
  cumpleFiltroEstado,
  pagadoEnRango,
  fechaCorta,
  type UnidadParaPlanes,
} from "./planes-unidad";
import type { AcuerdoConDetalle } from "./types";

const AHORA = new Date("2026-10-07T12:00:00"); // miércoles

const U1: UnidadParaPlanes = { id: "u1", numeroUnidad: "MOV-1", clienteNombre: "Ana", modelo: "Flex 38", precioCliente: 24700 };
const U2: UnidadParaPlanes = { id: "u2", numeroUnidad: "MOV-2", clienteNombre: "Bruno", modelo: "Flex 18", precioCliente: 15000 };

function plan(over: Partial<AcuerdoConDetalle> = {}): AcuerdoConDetalle {
  return {
    id: "a1",
    unidadId: "u1",
    unidadNumero: "MOV-1",
    unidadModelo: "Flex 38",
    unidadEstado: "pendiente",
    clienteId: "c1",
    clienteNombre: "Ana",
    tipo: "cobro",
    concepto: "venta",
    descripcion: null,
    contraparte: "Ana",
    moneda: "USD",
    totalAcordado: 24700,
    notas: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}

function cuota(id: string, descripcion: string, importe: number, vencimiento: string | null = null, estado = "pendiente") {
  return { id, descripcion, importe, vencimiento, estado };
}

function pago(id: string, importe: number, fecha: string, cuotaId: string | null = null) {
  return {
    id,
    fecha,
    importe,
    modalidad: "transferencia",
    cuotaId,
    comprobanteUrl: null,
    comprobanteSignedUrl: null,
    notas: null,
    registradoPor: "a@x.com",
  };
}

describe("tipoDeCuota / resumenPlan", () => {
  it("clasifica por el comienzo de la descripción, sin importar mayúsculas", () => {
    expect(tipoDeCuota("Anticipo 30%")).toBe("anticipo");
    expect(tipoDeCuota(" cuota 2/3")).toBe("cuota");
    expect(tipoDeCuota("SALDO final")).toBe("saldo");
    expect(tipoDeCuota("Ajuste por flete")).toBe("otro");
  });

  it("'Anticipo + 3 cuotas'", () => {
    expect(resumenPlan(["Anticipo 30%", "Cuota 1/3", "Cuota 2/3", "Cuota 3/3"])).toBe("Anticipo + 3 cuotas");
  });

  it("singular/plural y el orden anticipo → cuotas → saldo → otros", () => {
    expect(resumenPlan(["Saldo", "Cuota 1/1", "Bonificación", "Anticipo"])).toBe("Anticipo + 1 cuota + Saldo + 1 otro");
    expect(resumenPlan(["Anticipo 1", "Anticipo 2", "Saldo A", "Saldo B", "x", "y"])).toBe(
      "2 anticipos + 2 saldos + 2 otros"
    );
  });

  it("sin cuotas → vacío", () => {
    expect(resumenPlan([])).toBe("");
  });
});

describe("cuotaVencida", () => {
  const hoy = new Date("2026-10-07T00:00:00");
  it("pagada nunca está vencida", () => {
    expect(cuotaVencida({ estado: "pagado", vencimiento: "2026-01-01T00:00:00.000Z" }, hoy)).toBe(false);
  });
  it("estado 'vencido' persistido", () => {
    expect(cuotaVencida({ estado: "vencido", vencimiento: null }, hoy)).toBe(true);
  });
  it("pendiente con vencimiento pasado (aunque el barrido no haya corrido)", () => {
    expect(cuotaVencida({ estado: "pendiente", vencimiento: "2026-10-01T00:00:00" }, hoy)).toBe(true);
  });
  it("pendiente sin vencimiento o con vencimiento futuro", () => {
    expect(cuotaVencida({ estado: "pendiente", vencimiento: null }, hoy)).toBe(false);
    expect(cuotaVencida({ estado: "pendiente", vencimiento: "2026-10-20T00:00:00" }, hoy)).toBe(false);
  });
});

describe("filasPorUnidad", () => {
  it("incluye unidades sin plan, con estado 'sin_plan', moneda USD y todo en 0", () => {
    const [f] = filasPorUnidad([U1], [], AHORA);
    expect(f).toMatchObject({
      key: "u1|USD",
      moneda: "USD",
      planes: [],
      totalPlan: 0,
      pagado: 0,
      saldo: 0,
      porcentaje: 0,
      estado: "sin_plan",
      ultimoPagoFecha: null,
      resumenPlan: "",
      tieneVencidas: false,
      venceEstaSemana: false,
    });
  });

  it("plan sin pagos → pendiente, saldo = total", () => {
    const [f] = filasPorUnidad([U1], [plan({ cuotas: [cuota("q1", "Anticipo 30%", 7410), cuota("q2", "Saldo", 17290)] })], AHORA);
    expect(f.estado).toBe("pendiente");
    expect(f.saldo).toBe(24700);
    expect(f.resumenPlan).toBe("Anticipo + Saldo");
  });

  it("con pagos parciales → en curso; saldo y % de la unidad completa; último pago", () => {
    const [f] = filasPorUnidad(
      [U1],
      [
        plan({
          cuotas: [cuota("q1", "Anticipo 30%", 7410), cuota("q2", "Saldo", 17290)],
          movimientos: [pago("m2", 2000, "2026-09-20T00:00:00.000Z"), pago("m1", 7410, "2026-09-05T00:00:00.000Z", "q1")],
        }),
      ],
      AHORA
    );
    expect(f.estado).toBe("en_curso");
    expect(f.pagado).toBe(9410);
    expect(f.saldo).toBe(15290);
    expect(f.porcentaje).toBeCloseTo(38.1, 1);
    expect(f.ultimoPagoFecha).toBe("2026-09-20T00:00:00.000Z");
  });

  it("pagado completo → saldado, 100%, saldo 0 (tolerando redondeo y sobrepago)", () => {
    const [f] = filasPorUnidad(
      [U1],
      [plan({ totalAcordado: 0.3, movimientos: [pago("m1", 0.1, "2026-10-01T00:00:00.000Z"), pago("m2", 0.2, "2026-10-02T00:00:00.000Z")] })],
      AHORA
    );
    expect(f.estado).toBe("saldado");
    expect(f.porcentaje).toBe(100);
    const [sobre] = filasPorUnidad([U1], [plan({ totalAcordado: 100, movimientos: [pago("m1", 150, "2026-10-01")] })], AHORA);
    expect(sobre.saldo).toBe(0);
    expect(sobre.porcentaje).toBe(100);
  });

  it("varios planes de la misma unidad y moneda se suman (ej: pagos a varios proveedores)", () => {
    const filas = filasPorUnidad(
      [U1],
      [
        plan({ id: "p1", tipo: "pago", totalAcordado: 30000, movimientos: [pago("m1", 9000, "2026-09-01")] }),
        plan({ id: "p2", tipo: "pago", totalAcordado: 2000 }),
      ],
      AHORA
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].totalPlan).toBe(32000);
    expect(filas[0].pagado).toBe(9000);
    expect(filas[0].planes.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("planes en dos monedas de la misma unidad → una fila por moneda", () => {
    const filas = filasPorUnidad(
      [U1],
      [plan({ id: "p1", moneda: "USD" }), plan({ id: "p2", moneda: "ARS", totalAcordado: 1_000_000 })],
      AHORA
    );
    expect(filas.map((f) => f.key)).toEqual(["u1|USD", "u1|ARS"]);
    expect(filas[1].totalPlan).toBe(1_000_000);
  });

  it("cada unidad recibe solo sus propios planes", () => {
    const filas = filasPorUnidad([U1, U2], [plan({ unidadId: "u2", totalAcordado: 15000 })], AHORA);
    expect(filas[0].estado).toBe("sin_plan");
    expect(filas[1].totalPlan).toBe(15000);
  });

  it("detecta cuotas vencidas y cuotas que vencen esta semana (lunes a domingo)", () => {
    const [f] = filasPorUnidad(
      [U1],
      [
        plan({
          cuotas: [
            cuota("q1", "Anticipo", 1000, "2026-09-01T00:00:00", "pendiente"),
            cuota("q2", "Cuota 1/2", 1000, "2026-10-09T00:00:00"),
            cuota("q3", "Cuota 2/2", 1000, "2026-10-08T00:00:00", "pagado"),
            cuota("q4", "Saldo", 1000, null),
          ],
        }),
      ],
      AHORA
    );
    expect(f.tieneVencidas).toBe(true);
    expect(f.venceEstaSemana).toBe(true);
    const [sinSemana] = filasPorUnidad([U1], [plan({ cuotas: [cuota("q3", "Cuota", 1000, "2026-10-08T00:00:00", "pagado")] })], AHORA);
    expect(sinSemana.venceEstaSemana).toBe(false);
    expect(sinSemana.tieneVencidas).toBe(false);
  });
});

describe("metricasPlanes", () => {
  it("pendiente por moneda, unidades saldadas este mes y unidades con vencidas", () => {
    const filas = filasPorUnidad(
      [U1, U2, { ...U2, id: "u3" }],
      [
        // u1: saldada con último pago este mes
        plan({ id: "p1", totalAcordado: 1000, movimientos: [pago("m1", 1000, "2026-10-02T12:00:00")] }),
        // u2: en curso, con cuota vencida, en ARS
        plan({
          id: "p2",
          unidadId: "u2",
          moneda: "ARS",
          totalAcordado: 500_000,
          cuotas: [cuota("q1", "Anticipo", 100_000, "2026-09-01T00:00:00")],
          movimientos: [pago("m2", 100_000, "2026-09-15T00:00:00")],
        }),
        // u3: saldada pero el mes pasado → no cuenta
        plan({ id: "p3", unidadId: "u3", totalAcordado: 300, movimientos: [pago("m3", 300, "2026-09-28T12:00:00")] }),
      ],
      AHORA
    );
    expect(metricasPlanes(filas, AHORA)).toEqual({
      pendiente: { USD: 0, ARS: 400_000 },
      unidadesSaldadasMes: 1,
      unidadesConVencidas: 1,
    });
  });

  it("sin filas → todo en 0", () => {
    expect(metricasPlanes([], AHORA)).toEqual({ pendiente: { USD: 0, ARS: 0 }, unidadesSaldadasMes: 0, unidadesConVencidas: 0 });
  });

  it("ignora monedas fuera de USD/ARS en el pendiente", () => {
    const filas = filasPorUnidad([U1], [plan({ moneda: "EUR", totalAcordado: 10 })], AHORA);
    expect(metricasPlanes(filas, AHORA).pendiente).toEqual({ USD: 0, ARS: 0 });
  });
});

describe("filtros de estado", () => {
  it("filtroEstadoDesdeQuery: valores válidos, alias y fallback", () => {
    expect(filtroEstadoDesdeQuery()).toBe("todos");
    expect(filtroEstadoDesdeQuery("en_curso")).toBe("en_curso");
    expect(filtroEstadoDesdeQuery("con_saldo")).toBe("con_saldo");
    expect(filtroEstadoDesdeQuery("pagado")).toBe("saldado");
    expect(filtroEstadoDesdeQuery("vencido")).toBe("vencidas");
    expect(filtroEstadoDesdeQuery("pendiente", "semana")).toBe("semana");
    expect(filtroEstadoDesdeQuery("no-existe")).toBe("todos");
  });

  it("cumpleFiltroEstado", () => {
    const [sinPlan] = filasPorUnidad([U1], [], AHORA);
    const [enCurso] = filasPorUnidad(
      [U1],
      [plan({ cuotas: [cuota("q1", "Anticipo", 10, "2026-01-01T00:00:00")], movimientos: [pago("m", 5, "2026-09-01")] })],
      AHORA
    );
    expect(cumpleFiltroEstado(sinPlan, "todos")).toBe(true);
    expect(cumpleFiltroEstado(sinPlan, "sin_plan")).toBe(true);
    expect(cumpleFiltroEstado(sinPlan, "con_saldo")).toBe(false);
    expect(cumpleFiltroEstado(enCurso, "con_saldo")).toBe(true);
    expect(cumpleFiltroEstado(enCurso, "en_curso")).toBe(true);
    expect(cumpleFiltroEstado(enCurso, "saldado")).toBe(false);
    expect(cumpleFiltroEstado(enCurso, "vencidas")).toBe(true);
    expect(cumpleFiltroEstado(enCurso, "semana")).toBe(false);
  });
});

describe("pagadoEnRango / fechaCorta", () => {
  const filaCon = (fechas: [string, number][]) =>
    filasPorUnidad(
      [U1],
      [plan({ movimientos: fechas.map(([fecha, importe], i) => pago(`m${i}`, importe, fecha)) })],
      AHORA
    )[0];

  it("suma los pagos dentro de [desde, hasta) y cuenta cuántos fueron", () => {
    const f = filaCon([
      ["2026-09-01T00:00:00.000Z", 100],
      ["2026-09-30T00:00:00.000Z", 200],
      ["2026-10-01T00:00:00.000Z", 400],
    ]);
    expect(pagadoEnRango(f, { desde: new Date(2026, 8, 1), hasta: new Date(2026, 9, 1) })).toEqual({ monto: 300, cantidad: 2 });
    expect(pagadoEnRango(f, { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) })).toEqual({ monto: 400, cantidad: 1 });
    expect(pagadoEnRango(f, { desde: new Date(2025, 0, 1), hasta: new Date(2025, 1, 1) })).toEqual({ monto: 0, cantidad: 0 });
  });

  it("compara por día: un pago del 1/10 (medianoche UTC) cuenta en octubre aunque en Argentina sea 30/9 21hs", () => {
    const f = filaCon([["2026-10-01T00:00:00.000Z", 400]]);
    expect(pagadoEnRango(f, { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) }).cantidad).toBe(1);
    expect(pagadoEnRango(f, { desde: new Date(2026, 8, 1), hasta: new Date(2026, 9, 1) }).cantidad).toBe(0);
  });

  it("fechaCorta → dd/mm (o — sin fecha)", () => {
    expect(fechaCorta("2026-09-05T00:00:00.000Z")).toBe("05/09");
    expect(fechaCorta(null)).toBe("—");
  });
});
