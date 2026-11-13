import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  mockLeadCount,
  mockLeadFindMany,
  mockConfigGroupBy,
  mockConfigCount,
  mockGetAdminUser,
  mockUnidadFindMany,
  mockUnidadGroupBy,
  mockUnidadCount,
  mockEnvioFindMany,
  mockCitaFindMany,
  mockAcuerdoPagoFindMany,
  mockFindUniqueCierre,
  mockCountMovimiento,
  mockFindManyMovimiento,
  mockMovimientoAggregate,
  mockAcuerdoPagoAggregate,
  mockCostoFindMany,
} = vi.hoisted(() => ({
  mockLeadCount: vi.fn(),
  mockLeadFindMany: vi.fn(),
  mockConfigGroupBy: vi.fn(),
  mockConfigCount: vi.fn(),
  mockGetAdminUser: vi.fn(),
  mockUnidadFindMany: vi.fn(),
  mockUnidadGroupBy: vi.fn(),
  mockUnidadCount: vi.fn(),
  mockEnvioFindMany: vi.fn(),
  mockCitaFindMany: vi.fn(),
  mockAcuerdoPagoFindMany: vi.fn(),
  mockFindUniqueCierre: vi.fn(),
  mockCountMovimiento: vi.fn(),
  mockFindManyMovimiento: vi.fn().mockResolvedValue([]),
  mockMovimientoAggregate: vi.fn(),
  mockAcuerdoPagoAggregate: vi.fn(),
  mockCostoFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lead: { count: mockLeadCount, findMany: mockLeadFindMany },
    configuracionPedido: { groupBy: mockConfigGroupBy, count: mockConfigCount },
    unidad: { findMany: mockUnidadFindMany, groupBy: mockUnidadGroupBy, count: mockUnidadCount },
    envio: { findMany: mockEnvioFindMany },
    cita: { findMany: mockCitaFindMany },
    cierrePeriodo: { findUnique: mockFindUniqueCierre },
    movimiento: { count: mockCountMovimiento, findMany: mockFindManyMovimiento, aggregate: mockMovimientoAggregate },
    acuerdoPago: { aggregate: mockAcuerdoPagoAggregate, findMany: mockAcuerdoPagoFindMany },
    costoLogistica: { findMany: mockCostoFindMany },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/UnidadesEnMovimientoGrid", () => ({
  default: ({ activas, entregadas }: { activas: unknown[]; entregadas: unknown[] }) => (
    <div>
      UnidadesEnMovimientoGrid activas:{activas.length} entregadas:{entregadas.length}
    </div>
  ),
}));

import AdminDashboardPage from "../page";
import { claveInicioMes, hoyAR, soloFecha, sumarDias } from "@/lib/fecha-ar";
import { whereIndicadorLead } from "@/lib/indicadores/leads";
import { whereIndicadorPedido } from "@/lib/indicadores/pedidos";

/** Sin datos, sin alertas — cada test override lo que necesita.
 * El orden de mockResolvedValueOnce importa: coincide con el orden
 * literal del array de Promise.all en page.tsx. */
function setupDefaults() {
  mockLeadCount.mockReset();
  mockLeadCount.mockResolvedValueOnce(0); // leadsHoy
  mockLeadCount.mockResolvedValueOnce(0); // leadsEnNegociacion
  mockLeadCount.mockResolvedValueOnce(0); // leadsGanadosMes
  mockLeadCount.mockResolvedValueOnce(0); // leadsSinRespuesta

  mockConfigGroupBy.mockResolvedValue([]);
  mockConfigCount.mockResolvedValue(0); // cobrosVencidos
  mockGetAdminUser.mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });

  mockUnidadFindMany.mockReset();
  mockUnidadFindMany.mockResolvedValueOnce([]); // unidadesActivas
  mockUnidadFindMany.mockResolvedValueOnce([]); // unidadesActualizadas24h
  mockUnidadFindMany.mockResolvedValueOnce([]); // unidadesEntregadas

  mockUnidadGroupBy.mockResolvedValue([]);

  mockUnidadCount.mockReset();
  mockUnidadCount.mockResolvedValueOnce(0); // unidadesEntregadasMes
  mockUnidadCount.mockResolvedValueOnce(0); // unidadesEnAduanaLargas

  mockEnvioFindMany.mockResolvedValue([]);
  mockCitaFindMany.mockResolvedValue([]);
  mockLeadFindMany.mockResolvedValue([]); // leadsPipelineResumen

  // Planes de cobro y de pago (completos) y costos de logística: de acá
  // salen el bloque Financiero y las alertas de cobros/pagos, con las
  // mismas funciones que /admin/cobranza y /admin/pagos.
  planesCobro = [];
  planesPago = [];
  costos = [];
  mockAcuerdoPagoFindMany.mockReset();
  mockAcuerdoPagoFindMany.mockImplementation(async (args: { where: { tipo: string } }) =>
    args.where.tipo === "cobro" ? planesCobro : planesPago
  );
  mockCostoFindMany.mockReset();
  mockCostoFindMany.mockImplementation(async () => costos);

  mockFindUniqueCierre.mockResolvedValue({ id: "cierre1" }); // mes anterior YA cerrado por default
  mockCountMovimiento.mockResolvedValue(0); // mesAnteriorTuvoMovimientos
  mockFindManyMovimiento.mockResolvedValue([]); // primerCobroPorUnidad

  // Bloque Financiero: 4 movimiento.aggregate (cobrado/pagado este mes +
  // movido total cobro/pago) y 2 acuerdoPago.aggregate (total acordado
  // cobro/pago) — mismo orden que el Promise.all de la página.
  mockMovimientoAggregate.mockReset();
  mockMovimientoAggregate.mockResolvedValue({ _sum: { importe: null } });
  mockAcuerdoPagoAggregate.mockReset();
  mockAcuerdoPagoAggregate.mockResolvedValue({ _sum: { totalAcordado: null } });
}

let planesCobro: ReturnType<typeof planDb>[] = [];
let planesPago: ReturnType<typeof planDb>[] = [];
let costos: ReturnType<typeof costoDb>[] = [];

/** Fecha sin hora (medianoche UTC) a `dias` de hoy en Argentina. */
function diaRelativo(dias: number): Date {
  return soloFecha(sumarDias(hoyAR(), dias));
}

/** Plan como lo devuelve Prisma (con unidad, cuotas y movimientos). */
function planDb(over: {
  id?: string;
  unidadId: string;
  tipo: "cobro" | "pago";
  moneda?: string;
  concepto?: string;
  totalAcordado: number;
  cuotas: { importe: number; vencimiento: Date | null; estado?: string }[];
  pagos?: { importe: number; fecha?: Date; cuotaIdx?: number }[];
}) {
  const id = over.id ?? `${over.unidadId}-${over.tipo}`;
  const cuotas = over.cuotas.map((c, i) => ({
    id: `${id}-q${i}`,
    descripcion: `Cuota ${i + 1}`,
    importe: c.importe,
    vencimiento: c.vencimiento,
    estado: c.estado ?? "pendiente",
  }));
  return {
    id,
    unidadId: over.unidadId,
    unidad: { numeroUnidad: `MOV-${over.unidadId}`, modelo: "Flex 38", estadoFabricacion: "en_produccion", cliente: { id: "c1", nombre: "Ana" } },
    tipo: over.tipo,
    concepto: over.concepto ?? (over.tipo === "cobro" ? "venta" : "fabrica"),
    descripcion: null,
    contraparte: "X",
    moneda: over.moneda ?? "USD",
    totalAcordado: over.totalAcordado,
    notas: null,
    createdAt: new Date(0),
    cuotas,
    movimientos: (over.pagos ?? []).map((p, i) => ({
      id: `${id}-m${i}`,
      fecha: p.fecha ?? diaRelativo(-1),
      importe: p.importe,
      modalidad: "transferencia",
      cuotaId: p.cuotaIdx === undefined ? null : cuotas[p.cuotaIdx].id,
      comprobanteUrl: null,
      notas: null,
      registradoPor: "a",
    })),
  };
}

/** Plan con una cuota vencida (hace 30 días) y `pagado` registrado sin cuota específica. */
function planVencido(unidadId: string, tipo: "cobro" | "pago", importe: number, pagado: number) {
  return planDb({
    unidadId,
    tipo,
    totalAcordado: importe,
    cuotas: [{ importe, vencimiento: diaRelativo(-30), estado: "vencido" }],
    pagos: pagado ? [{ importe: pagado }] : [],
  });
}

/** Plan de cobro con una cuota que vence hoy (dentro de los próximos 7 días). */
function planCobroQueVenceEstaSemana(unidadId: string, importe: number) {
  return planDb({ unidadId, tipo: "cobro", totalAcordado: importe, cuotas: [{ importe, vencimiento: diaRelativo(0) }] });
}

function costoDb(over: { id: string; estado: string; fecha: Date; importe: number; moneda?: string; concepto?: string }) {
  return {
    id: over.id,
    envioId: "e1",
    envio: { numeroPI: "PI-1", numeroContenedor: null },
    concepto: over.concepto ?? "flete",
    descripcion: null,
    moneda: over.moneda ?? "USD",
    importe: over.importe,
    fecha: over.fecha,
    estado: over.estado,
    comprobanteUrl: null,
    notas: null,
    prorrateado: false,
    createdAt: new Date(0),
    prorrateos: [],
  };
}


describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  // ── Orden de secciones (día a día) ──────────────────────────────────

  it("respeta el orden: Agenda del día, KPIs, Pipeline activo, Unidades en movimiento", async () => {
    render(await AdminDashboardPage());
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    const idxAgenda = headings.findIndex((t) => t?.startsWith("Agenda del día"));
    const idxPipeline = headings.indexOf("Pipeline activo");
    const idxUnidades = headings.indexOf("Unidades en movimiento");
    expect(idxAgenda).toBeGreaterThanOrEqual(0);
    expect(idxPipeline).toBeGreaterThan(idxAgenda);
    expect(idxUnidades).toBeGreaterThan(idxPipeline);
  });

  // ── KPIs unificados ───────────────────────────────────────────────────

  it("KPI Ventas muestra leads nuevos hoy, en negociación y ganados este mes", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(3).mockResolvedValueOnce(7).mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    expect(screen.getByText("💼 Ventas")).toBeInTheDocument();
    expect(screen.getByText("Leads nuevos hoy").nextElementSibling?.textContent).toBe("3");
    expect(screen.getByText("En negociación").nextElementSibling?.textContent).toBe("7");
    expect(screen.getByText("Ganados este mes").nextElementSibling?.textContent).toBe("2");
  });

  it("'En negociación' cuenta con el where del indicador (en_contacto + propuesta_enviada, sin 'nuevo')", async () => {
    render(await AdminDashboardPage());
    expect(mockLeadCount).toHaveBeenNthCalledWith(2, { where: whereIndicadorLead("en_negociacion", new Date()) });
    expect(mockLeadCount).toHaveBeenNthCalledWith(2, { where: { etapa: { in: ["en_contacto", "propuesta_enviada"] } } });
  });


  it("KPI Operaciones muestra unidades activas, en aduana y entregadas este mes", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" }, envio: null, documentos: [], modelo: null, precioCliente: null, provinciaDestino: null, estadoFabricacion: "pendiente" },
      { id: "u2", numeroUnidad: "MOV-2", cliente: { nombre: "Ana" }, envio: null, documentos: [], modelo: null, precioCliente: null, provinciaDestino: null, estadoFabricacion: "en_aduana" },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadGroupBy.mockResolvedValueOnce([{ estadoFabricacion: "en_aduana", _count: { _all: 4 } }]);
    mockUnidadCount.mockReset();
    mockUnidadCount.mockResolvedValueOnce(9).mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    expect(screen.getByText("📦 Operaciones")).toBeInTheDocument();
    expect(screen.getByText("Unidades activas").nextElementSibling?.textContent).toBe("2");
    expect(screen.getByText("En aduana ahora").nextElementSibling?.textContent).toBe("4");
    expect(screen.getByText("Entregadas este mes").nextElementSibling?.textContent).toBe("9");
  });

  it("KPI Financiero: mismas funciones que Cobranza y Pagos, cada moneda por separado", async () => {
    planesCobro = [
      // 50.000 acordados, 10.000 cobrados este mes y 5.000 el mes pasado.
      planDb({
        unidadId: "u1",
        tipo: "cobro",
        totalAcordado: 50000,
        cuotas: [{ importe: 50000, vencimiento: diaRelativo(40) }],
        pagos: [{ importe: 10000, fecha: soloFecha(claveInicioMes()) }, { importe: 5000, fecha: soloFecha(claveInicioMes(new Date(), -1)) }],
      }),
      // ARS: 1.000.000, sin pagos.
      planDb({ unidadId: "u2", tipo: "cobro", moneda: "ARS", totalAcordado: 1_000_000, cuotas: [{ importe: 1_000_000, vencimiento: diaRelativo(40) }] }),
      ...Array.from({ length: 3 }, (_, i) => planCobroQueVenceEstaSemana(`s${i}`, 1000)),
    ];
    planesPago = [
      planDb({ unidadId: "u1", tipo: "pago", totalAcordado: 20000, cuotas: [{ importe: 20000, vencimiento: diaRelativo(40) }], pagos: [{ importe: 6000, fecha: soloFecha(claveInicioMes()) }] }),
    ];
    costos = [
      costoDb({ id: "c1", estado: "pagado", fecha: soloFecha(claveInicioMes()), importe: 4000 }),
      costoDb({ id: "c2", estado: "pendiente", fecha: diaRelativo(10), importe: 300000, moneda: "ARS" }),
    ];
    render(await AdminDashboardPage());
    expect(screen.getByText("💰 Financiero")).toBeInTheDocument();
    expect(screen.getByText("Cobrado este mes").nextElementSibling?.textContent).toBe("USD 10.000");
    expect(screen.getByText("Por cobrar").nextElementSibling?.textContent).toBe("USD 38.000 + ARS 1.000.000"); // 35.000 + 3 × 1.000
    expect(screen.getByText("Vence esta semana").nextElementSibling?.textContent).toBe("3"); // unidades
    expect(screen.getByText("Pagado este mes").nextElementSibling?.textContent).toBe("USD 10.000"); // 6.000 plan + 4.000 flete
    expect(screen.getByText("Por pagar").nextElementSibling?.textContent).toBe("USD 14.000 + ARS 300.000");
  });


  it("montos financieros en null (sin movimientos/acuerdos todavía) se muestran como USD 0", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Cobrado este mes").nextElementSibling?.textContent).toBe("USD 0");
    expect(screen.getByText("Por cobrar").nextElementSibling?.textContent).toBe("USD 0");
    expect(screen.getByText("Pagado este mes").nextElementSibling?.textContent).toBe("USD 0");
    expect(screen.getByText("Por pagar").nextElementSibling?.textContent).toBe("USD 0");
  });

  // ── KPIs clickeables ──────────────────────────────────────────────────

  it("los KPIs de Ventas y Operaciones linkean a la lista filtrada por el mismo indicador", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Leads nuevos hoy").closest("a")).toHaveAttribute("href", "/admin/pipeline?indicador=nuevos_hoy");
    expect(screen.getByText("En negociación").closest("a")).toHaveAttribute("href", "/admin/pipeline?indicador=en_negociacion");
    expect(screen.getByText("Ganados este mes").closest("a")).toHaveAttribute("href", "/admin/pipeline?indicador=ganados_mes");
    expect(screen.getByText("Unidades activas").closest("a")).toHaveAttribute("href", "/admin/unidades?indicador=activas");
    expect(screen.getByText("En aduana ahora").closest("a")).toHaveAttribute("href", "/admin/unidades?indicador=en_aduana");
    expect(screen.getByText("Entregadas este mes").closest("a")).toHaveAttribute("href", "/admin/unidades?indicador=entregadas_mes");
  });


  it("los 5 KPIs Financieros navegan a /admin/cobranza o /admin/pagos", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Cobrado este mes").closest("a")).toHaveAttribute("href", "/admin/cobranza");
    expect(screen.getByText("Por cobrar").closest("a")).toHaveAttribute("href", "/admin/cobranza?estado=con_saldo");
    expect(screen.getByText("Vence esta semana").closest("a")).toHaveAttribute("href", "/admin/cobranza?vence=semana");
    expect(screen.getByText("Pagado este mes").closest("a")).toHaveAttribute("href", "/admin/pagos");
    expect(screen.getByText("Por pagar").closest("a")).toHaveAttribute("href", "/admin/pagos");
  });


  // ── Grilla de operaciones (activas + entregadas) ─────────────────────

  it("pasa las unidades activas serializadas a UnidadesEnMovimientoGrid", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([
      {
        id: "u1",
        numeroUnidad: "MOV-1",
        cliente: { nombre: "Juan" },
        envio: { numeroPI: "PI-1", fechaEmbarque: new Date("2026-01-01"), fechaArriboEstimado: new Date("2026-02-01") },
        documentos: [],
        modelo: "Flex 18",
        precioCliente: 50000,
        provinciaDestino: "Córdoba",
        estadoFabricacion: "en_transito",
      },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Unidades en movimiento")).toBeInTheDocument();
    expect(screen.getByText(/UnidadesEnMovimientoGrid activas:1 entregadas:0/)).toBeInTheDocument();
  });

  it("pasa las unidades entregadas serializadas (con fechaEntrega) a UnidadesEnMovimientoGrid", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([
      {
        id: "u9",
        numeroUnidad: "MOV-9",
        cliente: { nombre: "Delivered Co" },
        envio: { numeroPI: "PI-9", fechaEmbarque: null, fechaArriboEstimado: null },
        modelo: "Flex 38",
        precioCliente: 80000,
        provinciaDestino: "Mendoza",
        estadoFabricacion: "entregado",
        fechaEntrega: new Date("2026-03-01"),
      },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/UnidadesEnMovimientoGrid activas:0 entregadas:1/)).toBeInTheDocument();
  });

  it("la query de unidades entregadas filtra por estadoFabricacion 'entregado' y ordena por fechaEntrega desc", async () => {
    render(await AdminDashboardPage());
    const call = mockUnidadFindMany.mock.calls[2][0];
    expect(call.where).toEqual({ estadoFabricacion: "entregado" });
    expect(call.orderBy).toEqual({ fechaEntrega: "desc" });
  });

  // ── Pipeline activo (resumido) ───────────────────────────────────────

  it("muestra el mensaje vacío cuando no hay leads activos en el pipeline", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("No hay leads activos en el pipeline.")).toBeInTheDocument();
  });

  it("lista hasta 5 leads activos recientes con su etapa, y linkea a /admin/pipeline", async () => {
    mockLeadFindMany.mockResolvedValueOnce([
      { id: "l1", nombre: "Juan", apellido: "García", etapa: "propuesta_enviada", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/Juan García/)).toBeInTheDocument();
    expect(screen.getByText("Propuesta enviada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver pipeline completo/i })).toHaveAttribute("href", "/admin/pipeline");
  });

  it("cada lead del pipeline resumido linkea a /admin/pipeline?leadId=X (resaltado)", async () => {
    mockLeadFindMany.mockResolvedValueOnce([
      { id: "l1", nombre: "Juan", apellido: "García", etapa: "propuesta_enviada", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/Juan García/).closest("a")).toHaveAttribute("href", "/admin/pipeline?leadId=l1");
  });

  it("la query de leads del pipeline excluye ganado y perdido, ordena por más reciente y trae 5", async () => {
    render(await AdminDashboardPage());
    expect(mockLeadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { etapa: { notIn: ["ganado", "perdido"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    );
  });

  // ── Alertas (solo las 4 pedidas) ─────────────────────────────────────

  it("sin ninguna condición, no muestra la sección de alertas", async () => {
    render(await AdminDashboardPage());
    expect(screen.queryByText(/alertas y acciones urgentes/i)).not.toBeInTheDocument();
  });

  it("alerta: unidades en aduana hace más de 15 días, con botón Ver hacia la lista del mismo indicador", async () => {
    mockUnidadCount.mockReset();
    mockUnidadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("2 unidades en aduana hace más de 15 días");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/unidades?indicador=aduana_demorada");
  });


  it("consulta 'en aduana hace más de 15 días' contra updatedAt de Unidad", async () => {
    render(await AdminDashboardPage());
    const call = mockUnidadCount.mock.calls[1][0];
    expect(call.where.estadoFabricacion).toBe("en_aduana");
    expect(call.where.updatedAt.lte).toBeInstanceOf(Date);
  });

  it("alerta: pedidos confirmados hace más de 7 días sin ningún cobro registrado, con botón Ver a la lista filtrada", async () => {
    mockConfigCount.mockResolvedValueOnce(5);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("5 pedidos confirmados hace más de 7 días sin ningún cobro registrado");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/configuraciones?indicador=sin_anticipo");
  });


  it("alerta: leads sin respuesta hace más de 48hs, con botón Ver a la lista del mismo indicador", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(3);
    render(await AdminDashboardPage());
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/pipeline?indicador=sin_atender");
    const where = mockLeadCount.mock.calls[3][0].where;
    expect(where.contactado).toBe(false);
    expect(Date.now() - where.createdAt.lte.getTime()).toBeGreaterThanOrEqual(48 * 3600 * 1000);
  });


  it("alerta: documentación faltante con una sola unidad linkea directo a /admin/unidades/[id]", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" }, envio: null, documentos: [], modelo: null, precioCliente: null, provinciaDestino: null, estadoFabricacion: "pendiente" },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/unidades/u1");
  });

  it("alerta: documentación faltante con más de una unidad linkea al ancla #documentacion-faltante", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" }, envio: null, documentos: [], modelo: null, precioCliente: null, provinciaDestino: null, estadoFabricacion: "pendiente" },
      { id: "u2", numeroUnidad: "MOV-2", cliente: { nombre: "Ana" }, envio: null, documentos: [], modelo: null, precioCliente: null, provinciaDestino: null, estadoFabricacion: "pendiente" },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "#documentacion-faltante");
  });

  it("singular correcto para 1 pedido sin cobro", async () => {
    mockConfigCount.mockResolvedValueOnce(1);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 pedido confirmado hace más de 7 días sin ningún cobro registrado");
  });


  it("'sin anticipo' mira los cobros reales de Cobranza, no el campo manual anticipo", async () => {
    render(await AdminDashboardPage());
    const where = mockConfigCount.mock.calls[0][0].where;
    expect(where).toEqual(whereIndicadorPedido("sin_anticipo", new Date()));
    expect(where).not.toHaveProperty("anticipo");
    expect(where.NOT.cliente.unidades.some.acuerdosPago.some).toEqual({ tipo: "cobro", movimientos: { some: {} } });
  });


  it("alerta: leads sin respuesta hace más de 48hs", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(4);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("4 leads sin respuesta hace más de 48hs");
  });

  it("documentación faltante y cobros vencidos activan alertas independientemente de citas o envíos", async () => {
    mockCitaFindMany.mockResolvedValueOnce([{ id: "c1", nombre: "Juan", horario: "10:00", estado: "confirmada" }]);
    mockEnvioFindMany.mockResolvedValueOnce([
      { id: "e1", numeroPI: "PI-1", numeroContenedor: null, fechaArriboEstimado: new Date(), unidades: [{ estadoFabricacion: "en_transito" }] },
    ]);
    render(await AdminDashboardPage());
    expect(screen.queryByText(/alertas y acciones urgentes/i)).not.toBeInTheDocument();
  });

  it("alerta: unidades con cuotas de cobro vencidas y su saldo vencido, con botón Ver hacia /admin/cobranza?estado=vencidas", async () => {
    planesCobro = [
      planVencido("u1", "cobro", 5000, 2000),
      planVencido("u2", "cobro", 5000, 0),
      planVencido("u3", "cobro", 1000, 0),
    ];
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("3 unidades con cuotas de cobro vencidas — saldo vencido USD 9.000");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/cobranza?estado=vencidas");
  });

  it("alerta: pagos a proveedores vencidos (planes + logística), con saldo por moneda y botón Ver a la lista de vencidos", async () => {
    planesPago = [planVencido("u1", "pago", 15000, 5000)];
    costos = [
      costoDb({ id: "c1", estado: "pendiente", fecha: diaRelativo(-3), importe: 200000, moneda: "ARS", concepto: "despachante" }),
      costoDb({ id: "c2", estado: "pendiente", fecha: diaRelativo(0), importe: 999 }), // vence hoy: todavía no
      costoDb({ id: "c3", estado: "pagado", fecha: diaRelativo(-30), importe: 999 }),
    ];
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("2 pagos a proveedores vencidos — saldo vencido USD 10.000 + ARS 200.000");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/pagos?estado=vencido");
  });

  it("singular: 1 pago a proveedores vencido", async () => {
    planesPago = [planVencido("u1", "pago", 15000, 0)];
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 pago a proveedores vencido — saldo vencido USD 15.000");
  });


  it("un pago a proveedor registrado sin cuota específica que cubre la cuota vencida: no hay alerta (el bug)", async () => {
    // La cuota sigue guardada como "vencido" en la base: la alerta no mira
    // ese campo sino el saldo real.
    planesPago = [planVencido("u1", "pago", 15000, 15000)];
    render(await AdminDashboardPage());
    expect(screen.queryByText(/alertas y acciones urgentes/i)).not.toBeInTheDocument();
  });

  it("singular correcto para 1 unidad con cobro vencido", async () => {
    planesCobro = [planVencido("u1", "cobro", 5000, 0)];
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 unidad con cuotas de cobro vencidas");
  });

  it("trae todos los planes de cobro y de pago (con cuotas y movimientos) y los costos de logística", async () => {
    render(await AdminDashboardPage());
    const tipos = mockAcuerdoPagoFindMany.mock.calls.map((c) => c[0].where.tipo);
    expect(tipos).toEqual(["cobro", "pago"]);
    expect(mockAcuerdoPagoFindMany.mock.calls[0][0].include).toMatchObject({ cuotas: expect.any(Object), movimientos: expect.any(Object) });
    expect(mockCostoFindMany).toHaveBeenCalledTimes(1);
  });


  it("alerta: unidades con cuotas de cobro que vencen en los próximos 7 días, con su saldo y botón Ver", async () => {
    planesCobro = Array.from({ length: 4 }, (_, i) => planCobroQueVenceEstaSemana(`u${i}`, 1500));
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("4 unidades con cuotas de cobro que vencen en los próximos 7 días — saldo USD 6.000");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/cobranza?vence=semana");
  });


  it("singular correcto para 1 unidad con cuotas que vencen en la semana", async () => {
    planesCobro = [planCobroQueVenceEstaSemana("u1", 1000)];
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 unidad con cuotas de cobro que vencen");
    expect(alertBox.textContent).not.toContain("1 unidades");
  });


  it("alerta: mes anterior sin cerrar (con movimientos), con botón Ver hacia /admin/cobranza?tab=cierres", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce(null);
    mockCountMovimiento.mockResolvedValueOnce(5);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("sin cerrar");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/cobranza?tab=cierres");
  });

  it("no alerta 'sin cerrar' si el mes anterior no tuvo ningún movimiento (nada que cerrar)", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce(null);
    mockCountMovimiento.mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    expect(screen.queryByText(/sin cerrar/)).not.toBeInTheDocument();
  });

  it("no alerta 'sin cerrar' si el mes anterior ya está cerrado", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce({ id: "cierre1" });
    mockCountMovimiento.mockResolvedValueOnce(5);
    render(await AdminDashboardPage());
    expect(screen.queryByText(/sin cerrar/)).not.toBeInTheDocument();
  });

  it("consulta el cierre y los movimientos del mes calendario argentino anterior al actual", async () => {
    const anterior = claveInicioMes(new Date(), -1);
    const [anio, mes] = anterior.split("-").map(Number);
    render(await AdminDashboardPage());
    expect(mockFindUniqueCierre).toHaveBeenCalledWith({ where: { mes_anio: { mes, anio } } });
    const call = mockCountMovimiento.mock.calls[0][0];
    expect(call.where.fecha.gte).toEqual(soloFecha(anterior));
    expect(call.where.fecha.lt).toEqual(soloFecha(claveInicioMes()));
  });


  // ── Agenda del día ────────────────────────────────────────────────────

  it("Agenda del día muestra el mensaje vacío cuando no hay citas hoy", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Agenda del día (0)")).toBeInTheDocument();
    expect(screen.getByText("Sin citas agendadas hoy.")).toBeInTheDocument();
  });

  it("Agenda del día lista las citas de hoy con nombre, horario y estado", async () => {
    mockCitaFindMany.mockResolvedValueOnce([
      { id: "c1", nombre: "Juan Pérez", horario: "10:00", estado: "confirmada" },
      { id: "c2", nombre: "Ana López", horario: "15:00", estado: "completada" },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Agenda del día (2)")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez").closest("a")).toHaveAttribute("href", "/admin/agenda?citaId=c1");
    expect(screen.getByText("Ana López").closest("a")).toHaveAttribute("href", "/admin/agenda?citaId=c2");
  });

  it("Agenda del día: un estado de cita fuera del catálogo conocido se muestra tal cual", async () => {
    mockCitaFindMany.mockResolvedValueOnce([
      { id: "c1", nombre: "Juan", horario: "10:00", estado: "estado-raro" },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("estado-raro")).toBeInTheDocument();
  });

  // ── Resumen del día (solo unidades actualizadas — citas viven en Agenda) ──

  it("'Leads nuevos hoy' aparece una sola vez en toda la página (solo en el KPI de Ventas)", async () => {
    render(await AdminDashboardPage());
    expect(screen.getAllByText("Leads nuevos hoy")).toHaveLength(1);
  });

  it("Resumen del día muestra solo las unidades actualizadas (24hs)", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", estadoFabricacion: "en_produccion", cliente: { nombre: "Ana" } },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Resumen del día")).toBeInTheDocument();
    expect(screen.getByText(/MOV-1 · Ana/)).toBeInTheDocument();
  });

  // ── Envíos activos, Unidades por estado, Documentación faltante, Pedidos ──

  it("Envíos activos excluye los envíos con estado general 'entregado'", async () => {
    mockEnvioFindMany.mockResolvedValueOnce([
      { id: "e1", numeroPI: "PI-ACTIVO", numeroContenedor: null, fechaArriboEstimado: null, unidades: [{ estadoFabricacion: "en_transito" }] },
      { id: "e2", numeroPI: "PI-ENTREGADO", numeroContenedor: null, fechaArriboEstimado: null, unidades: [{ estadoFabricacion: "entregado" }] },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("PI-ACTIVO")).toBeInTheDocument();
    expect(screen.queryByText("PI-ENTREGADO")).not.toBeInTheDocument();
  });

  it("Unidades por estado linkea cada contador a /admin/unidades?estado=X", async () => {
    mockUnidadGroupBy.mockResolvedValueOnce([{ estadoFabricacion: "pendiente", _count: { _all: 4 } }]);
    render(await AdminDashboardPage());
    const link = screen.getByRole("link", { name: /4\s*Pendiente/ });
    expect(link).toHaveAttribute("href", "/admin/unidades?estado=pendiente");
  });

  it("Documentación faltante muestra el mensaje de completo cuando no hay ninguna", async () => {
    render(await AdminDashboardPage());
    expect(
      screen.getByText(/todas las unidades activas tienen su documentación crítica completa/i)
    ).toBeInTheDocument();
  });

  it("Documentación faltante lista unidades con secciones críticas sin documentos", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" }, envio: null, documentos: [], modelo: null, precioCliente: null, provinciaDestino: null, estadoFabricacion: "pendiente" },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Documentación faltante")).toBeInTheDocument();
    expect(screen.getByText(/MOV-1 · Juan/)).toBeInTheDocument();
  });

  it("Pedidos por estado usa el label conocido", async () => {
    mockConfigGroupBy.mockResolvedValueOnce([{ estadoPedido: "confirmado", _count: { _all: 3 } }]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  // ── Accesos rápidos por rol ──────────────────────────────────────────

  it("accesos rápidos filtra por rol y nunca incluye /admin", async () => {
    render(await AdminDashboardPage());
    expect(screen.queryByRole("link", { name: /^Dashboard$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Usuarios/ })).toBeInTheDocument();
  });

  it("sin sesión (session null), el rol cae a 'vendedor' por defecto sin romper la página", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    render(await AdminDashboardPage());
    expect(screen.getByText("💼 Ventas")).toBeInTheDocument();
  });

  // ── diasRestantesLabel: los 4 casos ──────────────────────────────────

  it("Envíos activos: días restantes muestra —, Vencido, Hoy y 'N días' según corresponda", async () => {
    const hoy = new Date();
    const enDiez = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const ayer = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    mockEnvioFindMany.mockResolvedValueOnce([
      { id: "e0", numeroPI: null, numeroContenedor: null, fechaArriboEstimado: null, unidades: [] },
      { id: "e1", numeroPI: "VENCIDO", numeroContenedor: null, fechaArriboEstimado: ayer, unidades: [] },
      { id: "e2", numeroPI: "HOY", numeroContenedor: null, fechaArriboEstimado: hoy, unidades: [] },
      { id: "e3", numeroPI: "EN-10-DIAS", numeroContenedor: null, fechaArriboEstimado: enDiez, unidades: [] },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("Vencido")).toBeInTheDocument();
    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("10 días")).toBeInTheDocument();
  });

  it("un envío sin unidades muestra estado general '—' en la tabla de Envíos activos", async () => {
    mockEnvioFindMany.mockResolvedValueOnce([
      { id: "e0", numeroPI: "SIN-UNIDADES", numeroContenedor: null, fechaArriboEstimado: null, unidades: [] },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("SIN-UNIDADES")).toBeInTheDocument();
  });

  // ── Singulares en las alertas ────────────────────────────────────────

  it("singular correcto para 1 lead sin respuesta", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 lead sin respuesta hace más de 48hs");
    expect(alertBox.textContent).not.toContain("1 leads");
  });

  it("singular correcto para 1 unidad en aduana hace más de 15 días", async () => {
    mockUnidadCount.mockReset();
    mockUnidadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 unidad en aduana hace más de 15 días");
    expect(alertBox.textContent).not.toContain("1 unidades");
  });

  // ── Fallbacks defensivos (??) ────────────────────────────────────────

  it("pipeline resumido: lead sin apellido y con una etapa fuera del catálogo conocido", async () => {
    mockLeadFindMany.mockResolvedValueOnce([
      { id: "l1", nombre: "Juan", apellido: null, etapa: "etapa-rara", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Juan")).toBeInTheDocument();
    expect(screen.getByText("etapa-rara")).toBeInTheDocument();
  });

  it("resumen del día: unidad actualizada sin número y con un estado fuera del catálogo conocido", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: null, estadoFabricacion: "estado-raro", cliente: { nombre: "Ana" } },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/Sin número · Ana/)).toBeInTheDocument();
    expect(screen.getByText("estado-raro")).toBeInTheDocument();
  });

  it("documentación faltante: unidad sin número y una sección faltante fuera del catálogo conocido", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([
      {
        id: "u1",
        numeroUnidad: null,
        cliente: { nombre: "Juan" },
        envio: null,
        documentos: [{ seccion: "seccion-rara" }],
        modelo: null,
        precioCliente: null,
        provinciaDestino: null,
        estadoFabricacion: "pendiente",
      },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/Sin número · Juan/)).toBeInTheDocument();
    // Con una sola sección crítica presente ("seccion-rara" no es ninguna de
    // las 3 críticas), las 3 críticas reales siguen apareciendo como faltantes.
    expect(screen.getByText(/Faltan:/)).toBeInTheDocument();
  });

  it("documentación faltante: corta en 15 y muestra el link a 'ver restantes'", async () => {
    const unidades = Array.from({ length: 17 }, (_, i) => ({
      id: `u${i}`,
      numeroUnidad: `MOV-${i}`,
      cliente: { nombre: "Juan" },
      envio: null,
      documentos: [],
      modelo: null,
      precioCliente: null,
      provinciaDestino: null,
      estadoFabricacion: "pendiente",
    }));
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce(unidades);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/Ver las 2 restantes en \/admin\/unidades/)).toBeInTheDocument();
  });
});
