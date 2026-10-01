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
  mockCuotaCount,
  mockFindUniqueCierre,
  mockCountMovimiento,
  mockFindManyMovimiento,
  mockMovimientoAggregate,
  mockAcuerdoPagoAggregate,
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
  mockCuotaCount: vi.fn(),
  mockFindUniqueCierre: vi.fn(),
  mockCountMovimiento: vi.fn(),
  mockFindManyMovimiento: vi.fn().mockResolvedValue([]),
  mockMovimientoAggregate: vi.fn(),
  mockAcuerdoPagoAggregate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lead: { count: mockLeadCount, findMany: mockLeadFindMany },
    configuracionPedido: { groupBy: mockConfigGroupBy, count: mockConfigCount },
    unidad: { findMany: mockUnidadFindMany, groupBy: mockUnidadGroupBy, count: mockUnidadCount },
    envio: { findMany: mockEnvioFindMany },
    cita: { findMany: mockCitaFindMany },
    cuota: { count: mockCuotaCount },
    cierrePeriodo: { findUnique: mockFindUniqueCierre },
    movimiento: { count: mockCountMovimiento, findMany: mockFindManyMovimiento, aggregate: mockMovimientoAggregate },
    acuerdoPago: { aggregate: mockAcuerdoPagoAggregate },
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

  mockCuotaCount.mockReset();
  mockCuotaCount.mockResolvedValueOnce(0); // cuotasVencenSemanaCobro (bloque Financiero)
  mockCuotaCount.mockResolvedValueOnce(0); // cuotasVencidas
  mockCuotaCount.mockResolvedValueOnce(0); // cuotasVencenSemana (combinada, alerta)

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

  it("aplica el filtro de 'en negociación' con las 3 etapas activas (nuevo/en_contacto/propuesta_enviada)", async () => {
    render(await AdminDashboardPage());
    expect(mockLeadCount).toHaveBeenNthCalledWith(2, {
      where: { etapa: { in: ["nuevo", "en_contacto", "propuesta_enviada"] } },
    });
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

  it("KPI Financiero: 5 métricas desde el libro de cobranza (AcuerdoPago/Movimiento/Cuota), formateadas en USD", async () => {
    mockMovimientoAggregate.mockReset();
    mockMovimientoAggregate.mockResolvedValueOnce({ _sum: { importe: 10000 } }); // cobradoEsteMes
    mockMovimientoAggregate.mockResolvedValueOnce({ _sum: { importe: 15000 } }); // movido total cobro (para "Por cobrar")
    mockMovimientoAggregate.mockResolvedValueOnce({ _sum: { importe: 4000 } }); // pagadoEsteMes
    mockMovimientoAggregate.mockResolvedValueOnce({ _sum: { importe: 6000 } }); // movido total pago (para "Por pagar")
    mockAcuerdoPagoAggregate.mockReset();
    mockAcuerdoPagoAggregate.mockResolvedValueOnce({ _sum: { totalAcordado: 50000 } }); // total acordado cobro
    mockAcuerdoPagoAggregate.mockResolvedValueOnce({ _sum: { totalAcordado: 20000 } }); // total acordado pago
    mockCuotaCount.mockReset();
    mockCuotaCount.mockResolvedValueOnce(7); // cuotasVencenSemanaCobro
    mockCuotaCount.mockResolvedValueOnce(0); // cuotasVencidas
    mockCuotaCount.mockResolvedValueOnce(0); // cuotasVencenSemana
    render(await AdminDashboardPage());
    expect(screen.getByText("💰 Financiero")).toBeInTheDocument();
    expect(screen.getByText("Cobrado este mes").nextElementSibling?.textContent).toBe("USD 10.000");
    expect(screen.getByText("Por cobrar").nextElementSibling?.textContent).toBe("USD 35.000"); // 50000 - 15000
    expect(screen.getByText("Vence esta semana").nextElementSibling?.textContent).toBe("7");
    expect(screen.getByText("Pagado este mes").nextElementSibling?.textContent).toBe("USD 4.000");
    expect(screen.getByText("Por pagar").nextElementSibling?.textContent).toBe("USD 14.000"); // 20000 - 6000
  });

  it("montos financieros en null (sin movimientos/acuerdos todavía) se muestran como USD 0", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Cobrado este mes").nextElementSibling?.textContent).toBe("USD 0");
    expect(screen.getByText("Por cobrar").nextElementSibling?.textContent).toBe("USD 0");
    expect(screen.getByText("Pagado este mes").nextElementSibling?.textContent).toBe("USD 0");
    expect(screen.getByText("Por pagar").nextElementSibling?.textContent).toBe("USD 0");
  });

  // ── KPIs clickeables ──────────────────────────────────────────────────

  it("los KPIs de Ventas y Operaciones navegan a la sección filtrada correspondiente", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Leads nuevos hoy").closest("a")).toHaveAttribute(
      "href",
      "/admin/pipeline?etapa=nuevo&desde=hoy"
    );
    expect(screen.getByText("En negociación").closest("a")).toHaveAttribute(
      "href",
      "/admin/pipeline?etapa=en_contacto,propuesta_enviada"
    );
    expect(screen.getByText("Ganados este mes").closest("a")).toHaveAttribute(
      "href",
      "/admin/pipeline?etapa=ganado&periodo=mes"
    );
    expect(screen.getByText("Unidades activas").closest("a")).toHaveAttribute(
      "href",
      "/admin/unidades?estado=activo"
    );
    expect(screen.getByText("En aduana ahora").closest("a")).toHaveAttribute(
      "href",
      "/admin/unidades?estado=en_aduana"
    );
    expect(screen.getByText("Entregadas este mes").closest("a")).toHaveAttribute(
      "href",
      "/admin/unidades?estado=entregado&periodo=mes"
    );
  });

  it("los 5 KPIs Financieros navegan a /admin/cobranza con el filtro correspondiente aplicado", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Cobrado este mes").closest("a")).toHaveAttribute(
      "href",
      "/admin/cobranza?tipo=cobro&estado=pagado&periodo=mes"
    );
    expect(screen.getByText("Por cobrar").closest("a")).toHaveAttribute(
      "href",
      "/admin/cobranza?tipo=cobro&estado=pendiente"
    );
    expect(screen.getByText("Vence esta semana").closest("a")).toHaveAttribute(
      "href",
      "/admin/cobranza?tipo=cobro&estado=pendiente&vence=semana"
    );
    expect(screen.getByText("Pagado este mes").closest("a")).toHaveAttribute(
      "href",
      "/admin/cobranza?tipo=pago&estado=pagado&periodo=mes"
    );
    expect(screen.getByText("Por pagar").closest("a")).toHaveAttribute(
      "href",
      "/admin/cobranza?tipo=pago&estado=pendiente"
    );
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

  it("alerta: unidades en aduana hace más de 15 días, con botón Ver hacia /admin/unidades filtrado", async () => {
    mockUnidadCount.mockReset();
    mockUnidadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("2 unidades en aduana hace más de 15 días");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute(
      "href",
      "/admin/unidades?estado=en_aduana"
    );
  });

  it("consulta 'en aduana hace más de 15 días' contra updatedAt de Unidad", async () => {
    render(await AdminDashboardPage());
    const call = mockUnidadCount.mock.calls[1][0];
    expect(call.where.estadoFabricacion).toBe("en_aduana");
    expect(call.where.updatedAt.lte).toBeInstanceOf(Date);
  });

  it("alerta: cobros vencidos (pedidos confirmados sin anticipo hace más de 7 días), con botón Ver", async () => {
    mockConfigCount.mockResolvedValueOnce(5);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("5 pedidos confirmados sin anticipo registrado hace más de 7 días");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/configuraciones");
  });

  it("alerta: leads sin contactar tiene botón Ver hacia /admin/pipeline?sinContactar=1", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(3);
    render(await AdminDashboardPage());
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute("href", "/admin/pipeline?sinContactar=1");
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

  it("singular correcto para 1 pedido con cobro vencido", async () => {
    mockConfigCount.mockResolvedValueOnce(1);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 pedido confirmado sin anticipo registrado hace más de 7 días");
  });

  it("consulta cobros vencidos contra ConfiguracionPedido (Unidad no tiene anticipo)", async () => {
    render(await AdminDashboardPage());
    expect(mockConfigCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estadoPedido: "confirmado", anticipo: null }),
      })
    );
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

  it("alerta: cuotas vencidas (combinadas, sin separar cobro/pago), con botón Ver hacia /admin/cobranza?tab=gestion&estado=vencido", async () => {
    mockCuotaCount.mockReset();
    mockCuotaCount.mockResolvedValueOnce(0).mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("3 cuotas vencidas");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute(
      "href",
      "/admin/cobranza?tab=gestion&estado=vencido"
    );
  });

  it("singular correcto para 1 cuota vencida", async () => {
    mockCuotaCount.mockReset();
    mockCuotaCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 cuota vencida");
    expect(alertBox.textContent).not.toContain("1 cuotas");
  });

  it("cuenta cuotas vencidas por fecha y estado != pagado, sin filtrar por tipo de acuerdo", async () => {
    render(await AdminDashboardPage());
    const call = mockCuotaCount.mock.calls[1][0];
    expect(call.where.estado).toEqual({ not: "pagado" });
    expect(call.where.vencimiento.lt).toBeInstanceOf(Date);
    expect(call.where.acuerdo).toBeUndefined();
  });

  it("alerta: cuotas que vencen esta semana, con botón Ver hacia /admin/cobranza?tab=gestion&estado=semana", async () => {
    mockCuotaCount.mockReset();
    mockCuotaCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(4);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("4 cuotas vencen esta semana");
    expect(screen.getByRole("link", { name: "Ver →" })).toHaveAttribute(
      "href",
      "/admin/cobranza?tab=gestion&estado=semana"
    );
  });

  it("singular correcto para 1 cuota que vence esta semana", async () => {
    mockCuotaCount.mockReset();
    mockCuotaCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 cuota vence esta semana");
    expect(alertBox.textContent).not.toContain("vencen");
  });

  it("cuotasVencenSemana consulta estado pendiente con vencimiento en la semana en curso", async () => {
    render(await AdminDashboardPage());
    const call = mockCuotaCount.mock.calls[2][0];
    expect(call.where.estado).toBe("pendiente");
    expect(call.where.vencimiento.gte).toBeInstanceOf(Date);
    expect(call.where.vencimiento.lt).toBeInstanceOf(Date);
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

  it("consulta el cierre y los movimientos del mes calendario anterior al actual", async () => {
    const now = new Date();
    const mesAnteriorFecha = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    render(await AdminDashboardPage());
    expect(mockFindUniqueCierre).toHaveBeenCalledWith({
      where: { mes_anio: { mes: mesAnteriorFecha.getMonth() + 1, anio: mesAnteriorFecha.getFullYear() } },
    });
    const call = mockCountMovimiento.mock.calls[0][0];
    expect(call.where.fecha.gte).toEqual(mesAnteriorFecha);
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
