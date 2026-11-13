// Para cada indicador del admin: el número que muestra el contador tiene que
// ser exactamente la cantidad de filas de la lista a la que linkea, sobre los
// mismos datos. Las listas son las páginas reales (/admin/pipeline,
// /admin/unidades, /admin/configuraciones) contra una base en memoria que
// evalúa los `where` de Prisma; los contadores usan las funciones de
// src/lib/indicadores, que son las que llama el dashboard.
//
// El "ahora" es las 23:30 del 30/11 en Argentina (en UTC ya es 1/12): los
// "hoy" y "este mes" tienen que ser los argentinos.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen, within } from "@testing-library/react";

const AHORA = new Date("2026-12-01T02:30:00Z");

type Fila = Record<string, unknown>;
const tablas: Record<string, Fila[]> = {};

// ── Evaluador mínimo de `where` de Prisma (lo que usan los indicadores) ──
function valor(v: unknown): unknown {
  return v instanceof Date ? v.getTime() : v;
}
function cumpleCampo(actual: unknown, cond: unknown): boolean {
  if (cond === null || typeof cond !== "object" || cond instanceof Date) return valor(actual) === valor(cond);
  const c = cond as Record<string, unknown>;
  if (Array.isArray(actual) && "some" in c) return actual.some((x) => cumple(x as Fila, c.some as Fila));
  const ops = ["in", "notIn", "not", "gte", "gt", "lte", "lt", "equals"];
  if (!Object.keys(c).some((k) => ops.includes(k))) return actual !== null && actual !== undefined && cumple(actual as Fila, c);
  const a = valor(actual) as number;
  if ("in" in c && !(c.in as unknown[]).map(valor).includes(a)) return false;
  if ("notIn" in c && (c.notIn as unknown[]).map(valor).includes(a)) return false;
  if ("not" in c && a === valor(c.not)) return false;
  if ("equals" in c && a !== valor(c.equals)) return false;
  if ("gte" in c && !(a !== null && a !== undefined && a >= (valor(c.gte) as number))) return false;
  if ("gt" in c && !(a !== null && a !== undefined && a > (valor(c.gt) as number))) return false;
  if ("lte" in c && !(a !== null && a !== undefined && a <= (valor(c.lte) as number))) return false;
  if ("lt" in c && !(a !== null && a !== undefined && a < (valor(c.lt) as number))) return false;
  return true;
}
function cumple(fila: Fila, where: Fila | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, cond]) => {
    if (k === "AND") return (cond as Fila[]).every((w) => cumple(fila, w));
    if (k === "NOT") return !cumple(fila, cond as Fila);
    return cumpleCampo(fila[k], cond);
  });
}
function modelo(nombre: string) {
  const filas = () => tablas[nombre] ?? [];
  return {
    findMany: vi.fn(async (args: { where?: Fila; take?: number; skip?: number } = {}) => {
      const r = filas().filter((f) => cumple(f, args.where));
      return r.slice(args.skip ?? 0, args.take ? (args.skip ?? 0) + args.take : undefined);
    }),
    count: vi.fn(async (args: { where?: Fila } = {}) => filas().filter((f) => cumple(f, args.where)).length),
  };
}

const dbMock = vi.hoisted(() => ({}) as Record<string, unknown>);
vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: vi.fn(async () => ({ rol: "admin", email: "a@x.com" })) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/admin/PipelineBoard", () => ({ default: () => null }));
vi.mock("@/components/admin/NuevoLeadButton", () => ({ default: () => null }));
vi.mock("@/components/admin/NuevaUnidadForm", () => ({ default: () => null }));
vi.mock("@/components/admin/NuevoPedidoManualForm", () => ({ default: () => null }));

import { INDICADORES_LEAD, hrefIndicadorLead, whereIndicadorLead, type IndicadorLead } from "../leads";
import { INDICADORES_UNIDAD, hrefIndicadorUnidad, whereIndicadorUnidad, type IndicadorUnidad } from "../unidades";
import { hrefIndicadorPedido, hrefPedidosPorEstado, whereIndicadorPedido, wherePedidoPorEstado } from "../pedidos";
import { whereCitasDelDia } from "../citas";
import { pagosVencidos } from "../pagos";
import { cobrosQueVencenEnLaSemana, cobrosVencidos } from "../cobros";
import { filasPorUnidad, cumpleFiltroEstado, metricasPlanes } from "@/lib/cobranza/planes-unidad";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";
import PagosVencidosLista from "@/components/admin/PagosVencidosLista";
import AdminPipelinePage from "@/app/admin/(dashboard)/pipeline/page";
import AdminUnidadesPage from "@/app/admin/(dashboard)/unidades/page";
import AdminConfiguracionesPage from "@/app/admin/(dashboard)/configuraciones/page";

const h = (horas: number) => new Date(AHORA.getTime() - horas * 3600 * 1000);
const dia = (clave: string) => new Date(`${clave}T00:00:00.000Z`); // solo fecha

beforeAll(() => {
  vi.useFakeTimers({ now: AHORA, toFake: ["Date"] });
  for (const m of ["lead", "unidad", "configuracionPedido", "cita", "adminUser", "cliente", "envio", "movimiento"]) {
    dbMock[m] = modelo(m);
  }
  tablas.lead = [
    // Hoy en Argentina (30/11 22:00) — en UTC ya es 1/12.
    { id: "l1", etapa: "nuevo", contactado: false, createdAt: h(1.5), vendedorId: null },
    // Hoy temprano, ya en contacto: cuenta como "nuevo hoy" (cualquier etapa).
    { id: "l2", etapa: "en_contacto", contactado: true, createdAt: h(20) },
    // Ayer en Argentina (29/11 23:59), pero en UTC sería 30/11.
    { id: "l3", etapa: "propuesta_enviada", contactado: false, createdAt: new Date("2026-11-30T02:59:00Z") },
    { id: "l4", etapa: "ganado", contactado: true, createdAt: new Date("2026-11-05T15:00:00Z") },
    // Ganado el 30/10 a las 22:00 en Argentina (en UTC, 31/10... sigue en octubre): no es de este mes.
    { id: "l5", etapa: "ganado", contactado: true, createdAt: new Date("2026-10-31T01:00:00Z") },
    { id: "l6", etapa: "perdido", contactado: false, createdAt: h(100) },
    { id: "l7", etapa: "nuevo", contactado: false, createdAt: h(47) }, // todavía no 48 h
  ].map((l) => ({ nombre: "N", apellido: null, origen: "web", origenVisita: null, ...l }));
  const base = { cliente: { nombre: "Ana" }, envio: null, clienteId: "c1", modelo: "Flex 38", precioCliente: 1, provinciaDestino: null };
  tablas.unidad = [
    { id: "u1", estadoFabricacion: "en_aduana", updatedAt: h(24 * 20), fechaEntrega: null, createdAt: h(1000) },
    { id: "u2", estadoFabricacion: "en_aduana", updatedAt: h(24 * 3), fechaEntrega: null, createdAt: h(1000) },
    { id: "u3", estadoFabricacion: "en_produccion", updatedAt: h(1), fechaEntrega: null, createdAt: h(1000) },
    // Entregada el 1/11 (solo fecha): este mes. La del 31/10, no.
    { id: "u4", estadoFabricacion: "entregado", updatedAt: h(1), fechaEntrega: dia("2026-11-01"), createdAt: h(1000) },
    { id: "u5", estadoFabricacion: "entregado", updatedAt: h(1), fechaEntrega: dia("2026-10-31"), createdAt: h(1000) },
  ].map((u) => ({ numeroUnidad: `MOV-${u.id}`, ...base, ...u }));
  const conCobro = { unidades: [{ acuerdosPago: [{ tipo: "cobro", movimientos: [{ id: "m" }] }] }] };
  const sinCobro = { unidades: [{ acuerdosPago: [{ tipo: "cobro", movimientos: [] }, { tipo: "pago", movimientos: [{ id: "p" }] }] }] };
  tablas.configuracionPedido = [
    // Confirmado hace 10 días, con anticipo cargado a mano pero sin cobros reales: cuenta.
    { id: "p1", estadoPedido: "confirmado", anticipo: 5000, fechaConfirmacion: dia("2026-11-20"), cliente: sinCobro },
    // Confirmado hace 10 días con un cobro registrado: no cuenta.
    { id: "p2", estadoPedido: "confirmado", anticipo: null, fechaConfirmacion: dia("2026-11-20"), cliente: conCobro },
    // Sin cliente vinculado: no hay cobros → cuenta.
    { id: "p3", estadoPedido: "confirmado", anticipo: null, fechaConfirmacion: dia("2026-11-23"), cliente: null },
    // Confirmado hace 6 días: todavía no.
    { id: "p4", estadoPedido: "confirmado", anticipo: null, fechaConfirmacion: dia("2026-11-24"), cliente: null },
    { id: "p5", estadoPedido: "consulta", anticipo: null, fechaConfirmacion: null, cliente: null },
  ].map((p) => ({ clienteNombre: "Ana", clienteWhatsapp: null, modelo: null, numeroConsulta: p.id, createdAt: h(500), ...p }));
  tablas.cita = [
    { id: "c1", fecha: dia("2026-11-30"), estado: "confirmada" },
    { id: "c2", fecha: dia("2026-11-30"), estado: "cancelada" },
    { id: "c3", fecha: dia("2026-12-01"), estado: "confirmada" }, // mañana en Argentina (hoy en UTC)
  ];
});

afterAll(() => {
  vi.useRealTimers();
});

function contar(tabla: string, where: Fila): number {
  return (tablas[tabla] ?? []).filter((f) => cumple(f, where)).length;
}

function paramsDe(href: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(href.split("?")[1] ?? ""));
}

/** Filas que devolvió la consulta principal de la lista: la primera con
 * `take` (listas paginadas) o la primera a secas. */
async function filasDeLaLista(nombre: string): Promise<number> {
  const m = dbMock[nombre] as ReturnType<typeof modelo>;
  const conTake = m.findMany.mock.calls.findIndex((c) => (c[0] as { take?: number } | undefined)?.take !== undefined);
  const filas = (await m.findMany.mock.results[conTake >= 0 ? conTake : 0].value) as unknown[];
  return filas.length;
}

describe("contador = filas de su lista (mismos datos)", () => {
  const leads = Object.keys(INDICADORES_LEAD) as IndicadorLead[];
  it.each(leads)("leads: %s", async (indicador) => {
    vi.clearAllMocks();
    const contador = contar("lead", whereIndicadorLead(indicador, new Date()) as Fila);
    await AdminPipelinePage({ searchParams: Promise.resolve(paramsDe(hrefIndicadorLead(indicador))) });
    expect(await filasDeLaLista("lead")).toBe(contador);
  });

  it("leads: valores esperados en el borde del día y del mes argentinos", () => {
    const n = (i: IndicadorLead) => contar("lead", whereIndicadorLead(i, new Date()) as Fila);
    expect(n("nuevos_hoy")).toBe(2); // l1, l2 (l3 es de ayer en Argentina)
    expect(n("en_negociacion")).toBe(2); // l2, l3 — sin "nuevo"
    expect(n("ganados_mes")).toBe(1); // l4 (l5 es de octubre)
    expect(n("sin_atender")).toBe(1); // l6 (l3 tiene 47,5 h y l7 47 h)
  });

  const unidades = Object.keys(INDICADORES_UNIDAD) as IndicadorUnidad[];
  it.each(unidades)("unidades: %s", async (indicador) => {
    vi.clearAllMocks();
    const contador = contar("unidad", whereIndicadorUnidad(indicador, new Date()) as Fila);
    await AdminUnidadesPage({ searchParams: Promise.resolve(paramsDe(hrefIndicadorUnidad(indicador))) });
    expect(await filasDeLaLista("unidad")).toBe(contador);
  });

  it("unidades: valores esperados", () => {
    const n = (i: IndicadorUnidad) => contar("unidad", whereIndicadorUnidad(i, new Date()) as Fila);
    expect([n("activas"), n("en_aduana"), n("aduana_demorada"), n("entregadas_mes")]).toEqual([3, 2, 1, 1]);
  });

  it("pedidos: confirmados sin cobro registrado hace más de 7 días", async () => {
    vi.clearAllMocks();
    const contador = contar("configuracionPedido", whereIndicadorPedido("sin_anticipo", new Date()) as Fila);
    expect(contador).toBe(2); // p1 (tiene anticipo manual pero ningún cobro) y p3
    render(await AdminConfiguracionesPage({ searchParams: Promise.resolve(paramsDe(hrefIndicadorPedido("sin_anticipo"))) }));
    expect(await filasDeLaLista("configuracionPedido")).toBe(contador);
    expect(screen.getByTestId("indicador-activo")).toHaveTextContent(`(${contador})`);
  });

  it.each(["confirmado", "consulta"])("pedidos por estado: %s", async (estado) => {
    vi.clearAllMocks();
    const contador = contar("configuracionPedido", wherePedidoPorEstado(estado) as Fila);
    await AdminConfiguracionesPage({ searchParams: Promise.resolve(paramsDe(hrefPedidosPorEstado(estado))) });
    expect(await filasDeLaLista("configuracionPedido")).toBe(contador);
  });

  it("agenda del día: hoy en Argentina, sin canceladas", () => {
    expect(contar("cita", whereCitasDelDia(new Date()) as Fila)).toBe(1);
  });
});

// ── Indicadores en memoria (planes de cobro/pago y logística) ──────────

function plan(over: Partial<AcuerdoConDetalle> & Pick<AcuerdoConDetalle, "id" | "unidadId" | "tipo">): AcuerdoConDetalle {
  return {
    unidadNumero: `MOV-${over.unidadId}`,
    unidadModelo: null,
    unidadEstado: "en_produccion",
    clienteId: "c",
    clienteNombre: "Ana",
    concepto: over.tipo === "cobro" ? "venta" : "fabrica",
    descripcion: null,
    contraparte: "X",
    moneda: "USD",
    totalAcordado: 1000,
    notas: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}
const cuota = (id: string, importe: number, vencimiento: string, estado = "pendiente") => ({
  id,
  descripcion: id,
  importe,
  vencimiento: `${vencimiento}T00:00:00.000Z`,
  estado,
});
const pago = (id: string, importe: number, cuotaId: string | null = null) => ({
  id,
  fecha: "2026-11-15T00:00:00.000Z",
  importe,
  modalidad: "transferencia",
  cuotaId,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a",
});

describe("contador = filas de su lista (planes y logística)", () => {
  const planesPago = [
    // Vencida el 29/11, sin pagar: vencida.
    plan({ id: "a", unidadId: "u1", tipo: "pago", cuotas: [cuota("a1", 1000, "2026-11-29")] }),
    // Vence hoy (30/11): todavía no (en UTC ya sería 1/12 y contaría).
    plan({ id: "b", unidadId: "u2", tipo: "pago", cuotas: [cuota("b1", 1000, "2026-11-30")] }),
    // Vencida, con estado guardado "vencido", pero cubierta por un pago sin cuota: no.
    plan({ id: "c", unidadId: "u3", tipo: "pago", cuotas: [cuota("c1", 1000, "2026-10-01", "vencido")], movimientos: [pago("p", 1000)] }),
    // Dos planes vencidos de la misma unidad: dos filas.
    plan({ id: "d", unidadId: "u4", tipo: "pago", moneda: "ARS", cuotas: [cuota("d1", 500, "2026-11-01")], movimientos: [pago("q", 200)] }),
    plan({ id: "e", unidadId: "u4", tipo: "pago", concepto: "transporte", cuotas: [cuota("e1", 300, "2026-11-02")] }),
  ];
  const costo = (id: string, estado: string, fecha: string): CostoLogisticaRow => ({
    id,
    envioId: "e1",
    envioNumeroPI: "PI-1",
    envioContenedor: null,
    concepto: "despachante",
    descripcion: null,
    moneda: "USD",
    importe: 100,
    fecha: `${fecha}T00:00:00.000Z`,
    estado,
    comprobanteUrl: null,
    comprobanteSignedUrl: null,
    notas: null,
    prorrateado: false,
    prorrateos: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const costos = [costo("k1", "pendiente", "2026-11-28"), costo("k2", "pendiente", "2026-11-30"), costo("k3", "pagado", "2026-11-01")];

  it("pagos vencidos: la tarjeta, la alerta del dashboard y la lista ?estado=vencido muestran las mismas filas", () => {
    const filas = pagosVencidos(planesPago, costos, new Date());
    expect(filas.map((f) => f.key)).toEqual(["plan|d", "plan|e", "logistica|k1", "plan|a"]);
    render(<PagosVencidosLista filas={filas} />);
    const lista = screen.getByTestId("pagos-vencidos");
    expect(within(lista).getAllByRole("row")).toHaveLength(filas.length + 1); // + encabezado
    expect(within(lista).getByText("Logística: Despachante")).toBeInTheDocument();
    expect(lista).toHaveTextContent("USD 1.400 + ARS 300");
  });

  const unidadesCobro = ["u1", "u2", "u3", "u4"].map((id) => ({ id, numeroUnidad: id, clienteNombre: "A", modelo: null, precioCliente: null }));
  const planesCobro = [
    plan({ id: "x", unidadId: "u1", tipo: "cobro", cuotas: [cuota("x1", 1000, "2026-11-29")] }),
    plan({ id: "y", unidadId: "u1", tipo: "cobro", moneda: "ARS", cuotas: [cuota("y1", 1000, "2026-11-20")] }), // misma unidad, otra moneda
    plan({ id: "z", unidadId: "u2", tipo: "cobro", cuotas: [cuota("z1", 1000, "2026-11-30"), cuota("z2", 1000, "2026-12-06")] }),
    plan({ id: "w", unidadId: "u3", tipo: "cobro", cuotas: [cuota("w1", 1000, "2026-12-07")] }), // fuera de los 7 días
  ];

  it("cobros vencidos: dashboard, tarjeta de Cobranza y grilla ?estado=vencidas cuentan unidades", () => {
    const filas = filasPorUnidad(unidadesCobro, planesCobro, new Date());
    const enLista = filas.filter((f) => cumpleFiltroEstado(f, "vencidas"));
    expect(cobrosVencidos(filas, new Date()).filas).toHaveLength(enLista.length);
    expect(metricasPlanes(filas, new Date()).unidadesConVencidas).toBe(enLista.length);
    expect(enLista.map((f) => f.key)).toEqual(["u1"]); // una fila, con USD y ARS adentro
    expect(enLista[0].monedas.map((m) => m.moneda)).toEqual(["USD", "ARS"]);
  });

  it("vencen esta semana: dashboard (alerta y KPI) y grilla ?vence=semana", () => {
    const filas = filasPorUnidad(unidadesCobro, planesCobro, new Date());
    const enLista = filas.filter((f) => cumpleFiltroEstado(f, "semana"));
    expect(cobrosQueVencenEnLaSemana(filas, new Date()).filas).toHaveLength(enLista.length);
    expect(enLista.map((f) => f.key)).toEqual(["u2"]); // vence el 30/11 (hoy) y el 6/12; el 7/12 queda afuera
  });
});
