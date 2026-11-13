import { describe, it, expect } from "vitest";
import { esIndicadorLead, hrefIndicadorLead, whereIndicadorLead, INDICADORES_LEAD, ETAPAS_EN_NEGOCIACION } from "../leads";
import { esIndicadorUnidad, hrefIndicadorUnidad, whereIndicadorUnidad } from "../unidades";
import { esIndicadorPedido, hrefIndicadorPedido, hrefPedidosPorEstado, whereIndicadorPedido, wherePedidoPorEstado } from "../pedidos";
import { whereCitasDelDia } from "../citas";
import { formatMontos, sumarMonto } from "../montos";
import { cuotasQueVencenEnLaSemana, planTieneVencidas, planVenceEnLaSemana, saldoVencidoPlan } from "../cuotas";
import { costoLogisticaVencido, metricasPagos, pagosVencidos, planPagoVencido, totalPorMoneda } from "../pagos";
import { cobradoEnRango } from "../cobros";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";

// 30/11/2026 23:30 en Argentina = 1/12 02:30 UTC.
const AHORA = new Date("2026-12-01T02:30:00Z");

describe("leads", () => {
  it("'hoy' y 'este mes' son los argentinos", () => {
    expect(whereIndicadorLead("nuevos_hoy", AHORA)).toEqual({ createdAt: { gte: new Date("2026-11-30T03:00:00Z") } });
    expect(whereIndicadorLead("ganados_mes", AHORA)).toEqual({ etapa: "ganado", createdAt: { gte: new Date("2026-11-01T03:00:00Z") } });
    expect(whereIndicadorLead("del_mes", AHORA)).toEqual({ createdAt: { gte: new Date("2026-11-01T03:00:00Z") } });
  });

  it("en negociación no incluye 'nuevo'; sin atender = no contactado y creado hace más de 48 h", () => {
    expect(ETAPAS_EN_NEGOCIACION).toEqual(["en_contacto", "propuesta_enviada"]);
    expect(whereIndicadorLead("en_negociacion", AHORA)).toEqual({ etapa: { in: ["en_contacto", "propuesta_enviada"] } });
    expect(whereIndicadorLead("sin_atender", AHORA)).toEqual({ contactado: false, createdAt: { lte: new Date("2026-11-29T02:30:00Z") } });
    expect(whereIndicadorLead("activos", AHORA)).toEqual({ etapa: { notIn: ["ganado", "perdido"] } });
    expect(whereIndicadorLead("en_propuesta", AHORA)).toEqual({ etapa: "propuesta_enviada" });
  });

  it("esIndicadorLead / href / labels", () => {
    expect(esIndicadorLead("nuevos_hoy")).toBe(true);
    expect(esIndicadorLead("toString")).toBe(false);
    expect(esIndicadorLead(undefined)).toBe(false);
    expect(hrefIndicadorLead("sin_atender")).toBe("/admin/pipeline?indicador=sin_atender");
    expect(INDICADORES_LEAD.sin_atender.label).toBe("Sin respuesta hace más de 48 h");
  });
});

describe("unidades", () => {
  it("entregadas este mes: fechaEntrega (solo fecha) dentro del mes argentino", () => {
    expect(whereIndicadorUnidad("entregadas_mes", AHORA)).toEqual({
      estadoFabricacion: "entregado",
      fechaEntrega: { gte: new Date("2026-11-01T00:00:00Z"), lt: new Date("2026-12-01T00:00:00Z") },
    });
  });

  it("aduana demorada, activas, en aduana", () => {
    expect(whereIndicadorUnidad("aduana_demorada", AHORA)).toEqual({
      estadoFabricacion: "en_aduana",
      updatedAt: { lte: new Date("2026-11-16T02:30:00Z") },
    });
    expect(whereIndicadorUnidad("activas", AHORA)).toEqual({ estadoFabricacion: { not: "entregado" } });
    expect(whereIndicadorUnidad("en_aduana", AHORA)).toEqual({ estadoFabricacion: "en_aduana" });
    expect(esIndicadorUnidad("activas")).toBe(true);
    expect(esIndicadorUnidad("x")).toBe(false);
    expect(hrefIndicadorUnidad("activas")).toBe("/admin/unidades?indicador=activas");
  });
});

describe("pedidos", () => {
  it("sin anticipo: confirmados hace más de 7 días (solo fecha) sin ningún cobro real", () => {
    expect(whereIndicadorPedido("sin_anticipo", AHORA)).toEqual({
      estadoPedido: "confirmado",
      fechaConfirmacion: { lte: new Date("2026-11-23T00:00:00Z") },
      NOT: { cliente: { unidades: { some: { acuerdosPago: { some: { tipo: "cobro", movimientos: { some: {} } } } } } } },
    });
    expect(esIndicadorPedido("sin_anticipo")).toBe(true);
    expect(esIndicadorPedido("otro")).toBe(false);
    expect(hrefIndicadorPedido("sin_anticipo")).toBe("/admin/configuraciones?indicador=sin_anticipo");
    expect(wherePedidoPorEstado("confirmado")).toEqual({ estadoPedido: "confirmado" });
    expect(hrefPedidosPorEstado("confirmado")).toBe("/admin/configuraciones?estado=confirmado");
  });
});

describe("citas", () => {
  it("del día argentino (solo fecha), sin canceladas", () => {
    expect(whereCitasDelDia(AHORA)).toEqual({ fecha: new Date("2026-11-30T00:00:00Z"), estado: { not: "cancelada" } });
  });
});

describe("montos", () => {
  it("formatMontos: USD primero, sin ceros, 'USD 0' si no hay nada", () => {
    expect(formatMontos({ ARS: 50000, USD: 1234.5, EUR: 0 })).toBe("USD 1.234,5 + ARS 50.000");
    expect(formatMontos({ EUR: 1, ARS: 2 })).toBe("ARS 2 + EUR 1");
    expect(formatMontos({ USD: 1234.56 }, 0)).toBe("USD 1.235");
    expect(formatMontos({})).toBe("USD 0");
    const m: Record<string, number> = {};
    sumarMonto(m, "USD", 1);
    sumarMonto(m, "USD", 2);
    expect(m).toEqual({ USD: 3 });
  });
});

function plan(over: Partial<AcuerdoConDetalle>): AcuerdoConDetalle {
  return {
    id: "a",
    unidadId: "u1",
    unidadNumero: "MOV-1",
    unidadModelo: null,
    unidadEstado: "x",
    clienteId: "c",
    clienteNombre: "Ana",
    tipo: "pago",
    concepto: "fabrica",
    descripcion: null,
    contraparte: "Heshi",
    moneda: "USD",
    totalAcordado: 1000,
    notas: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}
const cuota = (id: string, importe: number, vencimiento: string | null) => ({
  id,
  descripcion: id,
  importe,
  vencimiento: vencimiento ? `${vencimiento}T00:00:00.000Z` : null,
  estado: "pendiente",
});
const mov = (importe: number, fecha = "2026-11-10", cuotaId: string | null = null) => ({
  id: `m${importe}${fecha}`,
  fecha: `${fecha}T00:00:00.000Z`,
  importe,
  modalidad: "transferencia",
  cuotaId,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a",
});

describe("cuotas (saldo real)", () => {
  const p = plan({
    cuotas: [cuota("v", 600, "2026-11-20"), cuota("hoy", 300, "2026-11-30"), cuota("sem", 100, "2026-12-06"), cuota("sin", 50, null)],
    movimientos: [mov(200)],
  });

  it("vencidas y saldo vencido: el pago sin cuota reduce la que vence antes", () => {
    expect(planTieneVencidas(p, AHORA)).toBe(true);
    expect(saldoVencidoPlan(p, AHORA)).toBe(400);
  });

  it("próximos 7 días: desde hoy (incluido) hasta hoy + 7 (excluido), con saldo", () => {
    expect(cuotasQueVencenEnLaSemana(p, AHORA).map((c) => c.id)).toEqual(["hoy", "sem"]);
    expect(planVenceEnLaSemana(p, AHORA)).toBe(true);
    expect(planVenceEnLaSemana(plan({ cuotas: [cuota("x", 1, "2026-12-07")] }), AHORA)).toBe(false);
    // Pagada: no.
    expect(planVenceEnLaSemana(plan({ cuotas: [cuota("x", 1, "2026-12-01")], movimientos: [mov(1)] }), AHORA)).toBe(false);
  });
});

function costo(over: Partial<CostoLogisticaRow>): CostoLogisticaRow {
  return {
    id: "k",
    envioId: "e1",
    envioNumeroPI: "PI-1",
    envioContenedor: null,
    concepto: "flete",
    descripcion: "Maersk",
    moneda: "USD",
    importe: 100,
    fecha: "2026-11-29T00:00:00.000Z",
    estado: "pendiente",
    comprobanteUrl: null,
    comprobanteSignedUrl: null,
    notas: null,
    prorrateado: false,
    prorrateos: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("pagos", () => {
  it("costoLogisticaVencido: pendiente y con fecha (solo fecha) anterior a hoy en Argentina", () => {
    expect(costoLogisticaVencido({ estado: "pendiente", fecha: "2026-11-29T00:00:00.000Z" }, AHORA)).toBe(true);
    expect(costoLogisticaVencido({ estado: "pendiente", fecha: "2026-11-30T00:00:00.000Z" }, AHORA)).toBe(false);
    expect(costoLogisticaVencido({ estado: "pagado", fecha: "2026-01-01T00:00:00.000Z" }, AHORA)).toBe(false);
  });

  it("pagosVencidos: tipo, referencia, vencimiento más viejo y saldo; ignora cobros", () => {
    const filas = pagosVencidos(
      [
        plan({ cuotas: [cuota("q1", 500, "2026-11-01"), cuota("q2", 500, "2026-11-15")] }),
        plan({ id: "b", unidadNumero: null, concepto: "concepto-nuevo", cuotas: [cuota("q", 10, "2026-11-02")] }),
        plan({ id: "c", tipo: "cobro", cuotas: [cuota("q", 10, "2026-11-02")] }),
        plan({ id: "d", cuotas: [cuota("q", 10, "2026-12-15")] }),
      ],
      [costo({}), costo({ id: "k2", envioNumeroPI: null, concepto: "otro-nuevo", descripcion: null, moneda: "ARS", importe: 7 })],
      AHORA
    );
    expect(filas.map((f) => [f.key, f.tipo, f.referencia, f.vencimiento, f.moneda, f.saldo, f.contraparte])).toEqual([
      ["plan|a", "Fábrica", "MOV-1", "2026-11-01", "USD", 1000, "Heshi"],
      ["plan|b", "concepto-nuevo", "Unidad sin número", "2026-11-02", "USD", 10, "Heshi"],
      ["logistica|k", "Logística: Flete marítimo", "Envío PI-1", "2026-11-29", "USD", 100, "Maersk"],
      ["logistica|k2", "Logística: otro-nuevo", "Envío sin PI", "2026-11-29", "ARS", 7, ""],
    ]);
    expect(filas[0].href).toBe("/admin/unidades/u1");
    expect(filas[2].href).toBe("/admin/envios/e1");
    expect(totalPorMoneda(filas)).toEqual({ USD: 1110, ARS: 7 });
    expect(planPagoVencido(plan({ cuotas: [cuota("q", 1, "2026-11-01")] }), AHORA)).toBe(true);
  });

  it("metricasPagos: pagado en el mes argentino y por pagar, planes + logística, por moneda", () => {
    const m = metricasPagos(
      [
        plan({ totalAcordado: 1000, movimientos: [mov(300, "2026-11-01"), mov(100, "2026-10-31")] }),
        plan({ id: "b", moneda: "ARS", totalAcordado: 50, movimientos: [mov(60, "2026-11-20")] }), // sobrepagado: nada por pagar
        plan({ id: "c", tipo: "cobro", totalAcordado: 999 }),
      ],
      [costo({ estado: "pagado", fecha: "2026-11-30T00:00:00.000Z", importe: 40 }), costo({ estado: "pagado", fecha: "2026-12-01T00:00:00.000Z" }), costo({ importe: 5 })],
      AHORA
    );
    expect(m).toEqual({ pagadoMes: { USD: 340, ARS: 60 }, porPagar: { USD: 605, ARS: 0 } });
  });
});

describe("cobros", () => {
  it("cobradoEnRango: por moneda, contra la fecha (sin hora) del pago", () => {
    const r = cobradoEnRango(
      [plan({ tipo: "cobro", movimientos: [mov(10, "2026-11-01"), mov(5, "2026-12-01")] }), plan({ id: "b", tipo: "cobro", moneda: "ARS", movimientos: [mov(7, "2026-11-30")] })],
      { desde: new Date("2026-11-01T00:00:00Z"), hasta: new Date("2026-12-01T00:00:00Z") }
    );
    expect(r).toEqual({ USD: 10, ARS: 7 });
  });
});
