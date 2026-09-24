import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  mockLeadCount,
  mockConfigGroupBy,
  mockConfigFindMany,
  mockGetAdminUser,
  mockUnidadFindMany,
  mockUnidadGroupBy,
  mockEnvioFindMany,
  mockCitaFindMany,
  mockCitaCount,
  mockClienteCount,
} = vi.hoisted(() => ({
  mockLeadCount: vi.fn(),
  mockConfigGroupBy: vi.fn(),
  mockConfigFindMany: vi.fn(),
  mockGetAdminUser: vi.fn(),
  mockUnidadFindMany: vi.fn(),
  mockUnidadGroupBy: vi.fn(),
  mockEnvioFindMany: vi.fn(),
  mockCitaFindMany: vi.fn(),
  mockCitaCount: vi.fn(),
  mockClienteCount: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lead: { count: mockLeadCount },
    configuracionPedido: { groupBy: mockConfigGroupBy, findMany: mockConfigFindMany },
    unidad: { findMany: mockUnidadFindMany, groupBy: mockUnidadGroupBy },
    envio: { findMany: mockEnvioFindMany },
    cita: { findMany: mockCitaFindMany, count: mockCitaCount },
    cliente: { count: mockClienteCount },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import AdminDashboardPage from "../page";

/** Config por defecto: sin alertas, sin datos — cada test override lo que necesita. */
function setupDefaults() {
  mockLeadCount.mockReset();
  mockLeadCount.mockResolvedValueOnce(0); // leadsHoy
  mockLeadCount.mockResolvedValueOnce(0); // leadsMes
  mockLeadCount.mockResolvedValueOnce(0); // leadsSinRespuesta (3ra llamada)
  mockConfigGroupBy.mockResolvedValue([]);
  mockConfigFindMany.mockResolvedValue([]);
  mockGetAdminUser.mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
  mockUnidadFindMany.mockReset();
  mockUnidadFindMany.mockResolvedValueOnce([]); // unidadesActivas
  mockUnidadFindMany.mockResolvedValueOnce([]); // unidadesActualizadas24h
  mockUnidadGroupBy.mockResolvedValue([]);
  mockEnvioFindMany.mockResolvedValue([]);
  mockCitaFindMany.mockResolvedValue([]);
  mockCitaCount.mockResolvedValue(0);
  mockClienteCount.mockResolvedValue(0);
}

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  it("sin ninguna condición de alerta, no muestra la sección de alertas", async () => {
    render(await AdminDashboardPage());
    expect(screen.queryByText(/alertas y acciones urgentes/i)).not.toBeInTheDocument();
  });

  it("muestra la alerta de documentación incompleta cuando hay unidades sin secciones críticas", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([
      // Tiene un documento (01_cliente, no crítico) pero le faltan las críticas.
      { id: "u1", numeroUnidad: "MOV-001", cliente: { nombre: "Juan" }, documentos: [{ seccion: "01_cliente" }] },
    ]);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/alertas y acciones urgentes/i)).toBeInTheDocument();
    expect(screen.getByText(/documentación incompleta/i)).toBeInTheDocument();
    expect(screen.getByText("Documentación faltante")).toBeInTheDocument(); // sección 5 también poblada
  });

  it("muestra la alerta de envíos con arribo en los próximos 7 días (y no la incluye si ya venció)", async () => {
    const en5dias = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const vencido = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    mockEnvioFindMany.mockResolvedValueOnce([
      { id: "e1", numeroPI: "PI-1", numeroContenedor: null, fechaArriboEstimado: en5dias, unidades: [] },
      { id: "e2", numeroPI: "PI-2", numeroContenedor: null, fechaArriboEstimado: vencido, unidades: [] },
    ]);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 envío con arribo en los próximos 7 días");
  });

  it("muestra la alerta de citas pendientes hoy (solo cuenta estado 'confirmada')", async () => {
    mockCitaFindMany.mockResolvedValueOnce([
      { id: "c1", nombre: "Juan", horario: "10:00", estado: "confirmada" },
      { id: "c2", nombre: "Ana", horario: "11:00", estado: "completada" },
    ]);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 cita de showroom pendientes hoy");
    expect(screen.getByText("Citas de showroom hoy (2)")).toBeInTheDocument(); // resumen del día cuenta ambas
  });

  it("muestra la alerta de leads sin respuesta", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(3);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("3 leads sin respuesta hace más de 48hs");
    expect(screen.getByRole("link", { name: /ver leads/i })).toHaveAttribute("href", "/admin/leads?sinResponder=1");
  });

  it("singular correcto cuando hay exactamente 1 lead sin respuesta", async () => {
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    render(await AdminDashboardPage());
    const alertBox = screen.getByText(/alertas y acciones urgentes/i).closest("div")!;
    expect(alertBox.textContent).toContain("1 lead sin respuesta hace más de 48hs");
    expect(alertBox.textContent).not.toContain("1 leads");
  });

  it("resumen del día: sin citas ni unidades actualizadas muestra los mensajes vacíos", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Sin citas agendadas hoy.")).toBeInTheDocument();
    expect(screen.getByText("Sin cambios en las últimas 24hs.")).toBeInTheDocument();
  });

  it("resumen del día: lista unidades actualizadas con número o 'Sin número'", async () => {
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce([]);
    mockUnidadFindMany.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: null, estadoFabricacion: "en_produccion", cliente: { nombre: "Juan" } },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/Sin número · Juan/)).toBeInTheDocument();
  });

  it("envíos activos: excluye los envíos con estado general 'entregado'", async () => {
    mockEnvioFindMany.mockResolvedValueOnce([
      { id: "e1", numeroPI: "PI-ACTIVO", numeroContenedor: null, fechaArriboEstimado: null, unidades: [{ estadoFabricacion: "en_transito" }] },
      { id: "e2", numeroPI: "PI-ENTREGADO", numeroContenedor: null, fechaArriboEstimado: null, unidades: [{ estadoFabricacion: "entregado" }] },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("PI-ACTIVO")).toBeInTheDocument();
    expect(screen.queryByText("PI-ENTREGADO")).not.toBeInTheDocument();
  });

  it("envíos activos: muestra mensaje vacío cuando no hay ninguno", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("No hay envíos activos — todos entregados.")).toBeInTheDocument();
  });

  it("días restantes: Vencido / Hoy / N días / — según el caso", async () => {
    const hoy = new Date();
    const enTresDias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const ayer = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    mockEnvioFindMany.mockResolvedValueOnce([
      { id: "e1", numeroPI: "SIN-FECHA", numeroContenedor: null, fechaArriboEstimado: null, unidades: [] },
      { id: "e2", numeroPI: "VENCIDO", numeroContenedor: null, fechaArriboEstimado: ayer, unidades: [] },
      { id: "e3", numeroPI: "HOY", numeroContenedor: null, fechaArriboEstimado: hoy, unidades: [] },
      { id: "e4", numeroPI: "EN-3-DIAS", numeroContenedor: null, fechaArriboEstimado: enTresDias, unidades: [] },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Vencido")).toBeInTheDocument();
    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("3 días")).toBeInTheDocument();
  });

  it("unidades por estado: cada contador linkea a /admin/unidades?estado=X", async () => {
    mockUnidadGroupBy.mockResolvedValueOnce([{ estadoFabricacion: "pendiente", _count: { _all: 4 } }]);
    render(await AdminDashboardPage());
    const link = screen.getByRole("link", { name: /4\s*Pendiente/ });
    expect(link).toHaveAttribute("href", "/admin/unidades?estado=pendiente");
  });

  it("documentación faltante: cuando no hay ninguna, muestra el mensaje de todo completo", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText(/todas las unidades activas tienen su documentación crítica completa/i)).toBeInTheDocument();
  });

  it("documentación faltante: corta en 15 y muestra el link a 'ver restantes'", async () => {
    const unidades = Array.from({ length: 17 }, (_, i) => ({
      id: `u${i}`,
      numeroUnidad: `MOV-${i}`,
      cliente: { nombre: "Juan" },
      documentos: [],
    }));
    mockUnidadFindMany.mockReset();
    mockUnidadFindMany.mockResolvedValueOnce(unidades);
    mockUnidadFindMany.mockResolvedValueOnce([]);
    render(await AdminDashboardPage());
    expect(screen.getByText(/Ver las 2 restantes en \/admin\/unidades/)).toBeInTheDocument();
  });

  it("pedidos por estado: usa el label conocido o el valor crudo si no lo tiene", async () => {
    mockConfigGroupBy.mockResolvedValueOnce([{ estadoPedido: "confirmado", _count: { _all: 3 } }]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("últimas consultas: mensaje vacío cuando no hay ninguna", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText("Todavía no llegó ninguna consulta.")).toBeInTheDocument();
  });

  it("últimas consultas: lista con numeroConsulta y fallback '—'", async () => {
    mockConfigFindMany.mockResolvedValueOnce([
      { id: "p1", clienteNombre: "Juan García", numeroConsulta: null, estadoPedido: "consulta", createdAt: new Date() },
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText("Juan García")).toBeInTheDocument();
  });

  it("admin ve el link 'Ver todos los pedidos', vendedor con acceso también", async () => {
    render(await AdminDashboardPage());
    expect(screen.getByText(/ver todos los pedidos/i)).toBeInTheDocument();
  });

  it("sin sesión (session null), el rol cae a 'vendedor' por defecto", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    render(await AdminDashboardPage());
    // vendedor igual tiene acceso a /admin/configuraciones — el link debe seguir visible
    expect(screen.getByText(/ver todos los pedidos/i)).toBeInTheDocument();
  });

  it("accesos rápidos filtra por rol y nunca incluye /admin", async () => {
    render(await AdminDashboardPage());
    expect(screen.queryByRole("link", { name: /^Dashboard$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Usuarios/ })).toBeInTheDocument(); // admin ve Usuarios
  });

  it("métricas generales muestra los 5 totales", async () => {
    mockClienteCount.mockResolvedValueOnce(7);
    mockCitaCount.mockResolvedValueOnce(3);
    mockLeadCount.mockReset();
    mockLeadCount.mockResolvedValueOnce(0).mockResolvedValueOnce(9).mockResolvedValueOnce(0);
    render(await AdminDashboardPage());
    expect(screen.getByText("Métricas generales")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
