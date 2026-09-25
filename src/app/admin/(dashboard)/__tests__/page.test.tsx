import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  mockUnidadAggregate,
  mockEnvioFindMany,
  mockCitaFindMany,
} = vi.hoisted(() => ({
  mockLeadCount: vi.fn(),
  mockLeadFindMany: vi.fn(),
  mockConfigGroupBy: vi.fn(),
  mockConfigCount: vi.fn(),
  mockGetAdminUser: vi.fn(),
  mockUnidadFindMany: vi.fn(),
  mockUnidadGroupBy: vi.fn(),
  mockUnidadCount: vi.fn(),
  mockUnidadAggregate: vi.fn(),
  mockEnvioFindMany: vi.fn(),
  mockCitaFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lead: { count: mockLeadCount, findMany: mockLeadFindMany },
    configuracionPedido: { groupBy: mockConfigGroupBy, count: mockConfigCount },
    unidad: { findMany: mockUnidadFindMany, groupBy: mockUnidadGroupBy, count: mockUnidadCount, aggregate: mockUnidadAggregate },
    envio: { findMany: mockEnvioFindMany },
    cita: { findMany: mockCitaFindMany },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/UnidadesEnMovimientoGrid", () => ({
  default: ({ unidades }: { unidades: unknown[] }) => <div>UnidadesEnMovimientoGrid: {unidades.length}</div>,
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

  mockUnidadGroupBy.mockResolvedValue([]);

  mockUnidadCount.mockReset();
  mockUnidadCount.mockResolvedValueOnce(0); // unidadesEntregadasMes
  mockUnidadCount.mockResolvedValueOnce(0); // unidadesCobroPendienteSemana
  mockUnidadCount.mockResolvedValueOnce(0); // unidadesEnAduanaLargas

  mockUnidadAggregate.mockReset();
  mockUnidadAggregate.mockResolvedValueOnce({ _sum: { precioCliente: null } }); // ganadas este mes
  mockUnidadAggregate.mockResolvedValueOnce({ _sum: { precioCliente: null } }); // pendiente de cobro

  mockEnvioFindMany.mockResolvedValue([]);
  mockCitaFindMany.mockResolvedValue([]);
  mockLeadFindMany.mockResolvedValue([]); // leadsPipelineResumen
}

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
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
    mockUnidadGroupBy.mockResolvedValueOnce([{ estadoFabricacion: "en_aduana", _count: { _all: 4 } }]);
    mockUnidadCount.mockReset();
    mockUnidadCount.mockResolvedValueOnce(9).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    expect(screen.getByText("📦 Operaciones")).toBeInTheDocument();
    expect(screen.getByText("Unidades activas").nextElementSibling?.textContent).toBe("2");
    expect(screen.getByText("En aduana ahora").nextElementSibling?.textContent).toBe("4");
    expect(screen.getByText("Entregadas este mes").nextElementSibling?.textContent).toBe("9");
  });

  it("KPI Financiero formatea los montos en USD y muestra el conteo de cobro pendiente", async () => {
    mockUnidadAggregate.mockReset();
    mockUnidadAggregate.mockResolvedValueOnce({ _sum: { precioCliente: 45000 } });
    mockUnidadAggregate.mockResolvedValueOnce({ _sum: { precioCliente: 120000 } });
    mockUnidadCount.mockReset();
    mockUnidadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    expect(screen.getByText("💰 Financiero")).toBeInTheDocument();
    expect(screen.getByText("Ganado este mes").nextElementSibling?.textContent).toBe("USD 45.000");
    expect(screen.getByText("Pendiente de cobro").nextElementSibling?.textContent).toBe("USD 120.000");
    expect(screen.getByText("Cobro pendiente esta semana").nextElementSibling?.textContent).toBe("3");
  });

  it("montos financieros en null (sin unidades) se muestran como USD 0", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Ganado este mes").nextElementSibling?.textContent).toBe("USD 0");
  });

  // ── Grilla de operaciones ────────────────────────────────────────────

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
    render(await AdminDashboardPage());
    expect(screen.getByText("Unidades en movimiento")).toBeInTheDocument();
    expect(screen.getByText("UnidadesEnMovimientoGrid: 1")).toBeInTheDocument();
  });

  // ── Pipeline de leads resumido ───────────────────────────────────────

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

  // ── Alertas ──────────────────────────────────────────────────────────

  it("sin ninguna condición, no muestra la sección de alertas", async () => {
    render(await AdminDashboardPage());
    expect(screen.queryByText(/alertas y acciones urgentes/i)).not.toBeInTheDocument();
  });

  it("alerta nueva: unidades en aduana hace más de 15 días", async () => {
    mockUnidadCount.mockReset();
    mockUnidadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("2 unidades en aduana hace más de 15 días");
    expect(screen.getByRole("link", { name: /ver unidades/i })).toHaveAttribute(
      "href",
      "/admin/unidades?estado=en_aduana"
    );
  });

  it("consulta 'en aduana hace más de 15 días' contra updatedAt de Unidad", async () => {
    render(await AdminDashboardPage());
    const call = mockUnidadCount.mock.calls[2][0];
    expect(call.where.estadoFabricacion).toBe("en_aduana");
    expect(call.where.updatedAt.lte).toBeInstanceOf(Date);
  });

  it("alerta nueva: cobros vencidos (pedidos confirmados sin anticipo hace más de 7 días)", async () => {
    mockConfigCount.mockResolvedValueOnce(5);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("5 pedidos confirmados sin anticipo registrado hace más de 7 días");
    expect(screen.getByRole("link", { name: /ver pedidos/i })).toHaveAttribute("href", "/admin/configuraciones");
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

  it("alerta existente: leads sin respuesta hace más de 48hs", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(4);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("4 leads sin respuesta hace más de 48hs");
  });

  // ── Resumen del día (ya no incluye 'Leads nuevos hoy' — está en KPIs) ──

  it("'Leads nuevos hoy' aparece una sola vez en toda la página (solo en el KPI de Ventas)", async () => {
    render(await AdminDashboardPage());
    expect(screen.getAllByText("Leads nuevos hoy")).toHaveLength(1);
  });

  it("Resumen del día muestra las citas de hoy y las unidades actualizadas", async () => {
    mockCitaFindMany.mockResolvedValueOnce([
      { id: "c1", nombre: "Juan", horario: "10:00", estado: "confirmada" },
    ]);
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", estadoFabricacion: "en_produccion", cliente: { nombre: "Ana" } },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Citas de showroom hoy (1)")).toBeInTheDocument();
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

  // ── startOfWeek: domingo vs. resto de la semana ─────────────────────

  describe("startOfWeek — domingo cuenta como fin de la semana anterior", () => {
    afterEach(() => vi.useRealTimers());

    it("con 'hoy' en domingo, la semana calculada arranca el lunes previo", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 27, 12, 0, 0)); // domingo 27 sep 2026
      render(await AdminDashboardPage());
      const call = mockUnidadCount.mock.calls[1][0]; // unidadesCobroPendienteSemana
      expect(call.where.fechaEntregaEstimada.gte).toEqual(new Date(2026, 8, 21));
      expect(call.where.fechaEntregaEstimada.lt).toEqual(new Date(2026, 8, 28));
    });

    it("con 'hoy' en miércoles, la semana calculada arranca el lunes de esa misma semana", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 23, 12, 0, 0)); // miércoles 23 sep 2026
      render(await AdminDashboardPage());
      const call = mockUnidadCount.mock.calls[1][0];
      expect(call.where.fechaEntregaEstimada.gte).toEqual(new Date(2026, 8, 21));
      expect(call.where.fechaEntregaEstimada.lt).toEqual(new Date(2026, 8, 28));
    });
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

  it("singular correcto para 1 cita pendiente hoy", async () => {
    mockCitaFindMany.mockResolvedValueOnce([{ id: "c1", nombre: "Juan", horario: "10:00", estado: "confirmada" }]);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 cita de showroom pendientes hoy");
  });

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
    mockUnidadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
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
    render(await AdminDashboardPage());
    expect(screen.getByText(/Ver las 2 restantes en \/admin\/unidades/)).toBeInTheDocument();
  });
});
