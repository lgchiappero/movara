import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindManyLead, mockFindManyVendedor, mockCountLead, mockGetAdminUser } = vi.hoisted(() => ({
  mockFindManyLead: vi.fn(),
  mockFindManyVendedor: vi.fn(),
  mockCountLead: vi.fn(),
  mockGetAdminUser: vi.fn().mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lead: { findMany: mockFindManyLead, count: mockCountLead },
    adminUser: { findMany: mockFindManyVendedor },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/PipelineBoard", () => ({
  default: ({
    leads,
    vendedores,
    highlightLeadId,
    rol,
  }: {
    leads: unknown[];
    vendedores: unknown[];
    highlightLeadId?: string | null;
    rol: string;
  }) => (
    <div>
      PipelineBoard leads={leads.length} vendedores={vendedores.length} highlightLeadId={highlightLeadId ?? "none"}{" "}
      rol={rol}
    </div>
  ),
}));

import AdminPipelinePage from "../page";

const LEAD = {
  id: "l1",
  nombre: "Juan",
  apellido: "García",
  dni: null,
  telefono: "123",
  email: "juan@x.com",
  provincia: "Córdoba",
  mensaje: "Hola",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  contactado: false,
  contactadoEn: null,
  etapa: "nuevo",
  origen: "web",
  vendedorId: null,
  notasVenta: null,
  motivoPerdida: null,
  clienteId: null,
  valorEstimado: null,
};

describe("AdminPipelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyLead.mockResolvedValue([]);
    mockFindManyVendedor.mockResolvedValue([]);
    mockCountLead.mockResolvedValue(0);
  });

  it("muestra el estado vacío genérico sin filtros", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Todavía no hay leads cargados.")).toBeInTheDocument();
    expect(screen.queryByText("Limpiar filtros")).not.toBeInTheDocument();
  });

  it("muestra el estado vacío de 'sin coincidencias' cuando hay filtros activos", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({ etapa: "ganado" }) }));
    expect(screen.getByText("Ningún lead coincide con los filtros.")).toBeInTheDocument();
    expect(screen.getByText("Limpiar filtros")).toBeInTheDocument();
  });

  it("un valor de etapa inválido en el querystring se ignora (no filtra ni rompe)", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({ etapa: "no-existe" }) }));
    expect(mockFindManyLead).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("un valor de origen inválido en el querystring se ignora", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({ origen: "no-existe" }) }));
    expect(mockFindManyLead).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("aplica los 3 filtros (etapa/vendedorId/origen) al where", async () => {
    render(
      await AdminPipelinePage({
        searchParams: Promise.resolve({ etapa: "propuesta_enviada", vendedorId: "v1", origen: "instagram" }),
      })
    );
    expect(mockFindManyLead).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { etapa: "propuesta_enviada", vendedorId: "v1", origen: "instagram" },
      })
    );
  });

  it("renderiza los tabs de etapa, marcando 'Todos' activo por defecto", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    const todos = screen.getByRole("link", { name: "Todos" });
    expect(todos).toHaveAttribute("href", "/admin/pipeline");
    expect(todos.className).toContain("bg-[#2F2F2F]");
  });

  it("el tab de la etapa activa conserva vendedorId/origen en el href", async () => {
    render(
      await AdminPipelinePage({ searchParams: Promise.resolve({ vendedorId: "v1", origen: "web" }) })
    );
    const ganado = screen.getByRole("link", { name: "Ganado" });
    expect(ganado).toHaveAttribute("href", "/admin/pipeline?etapa=ganado&vendedorId=v1&origen=web");
  });

  it("pasa los leads serializados (fechas a ISO string) y los vendedores a PipelineBoard", async () => {
    mockFindManyLead.mockResolvedValueOnce([LEAD]);
    mockFindManyVendedor.mockResolvedValueOnce([{ id: "v1", nombre: "Vendedor 1" }]);
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/PipelineBoard leads=1 vendedores=1/)).toBeInTheDocument();
  });

  it("pasa leadId como highlightLeadId a PipelineBoard (deep link 'resaltado' desde el dashboard)", async () => {
    mockFindManyLead.mockResolvedValueOnce([LEAD]);
    render(await AdminPipelinePage({ searchParams: Promise.resolve({ leadId: "l1" }) }));
    expect(screen.getByText(/highlightLeadId=l1/)).toBeInTheDocument();
  });

  it("sin leadId en el querystring, highlightLeadId es 'none'", async () => {
    mockFindManyLead.mockResolvedValueOnce([LEAD]);
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/highlightLeadId=none/)).toBeInTheDocument();
  });

  it("etapa acepta una lista separada por comas (deep link de KPI 'En negociación')", async () => {
    render(
      await AdminPipelinePage({
        searchParams: Promise.resolve({ etapa: "en_contacto,propuesta_enviada" }),
      })
    );
    expect(mockFindManyLead).toHaveBeenCalledWith(
      expect.objectContaining({ where: { etapa: { in: ["en_contacto", "propuesta_enviada"] } } })
    );
  });

  it("una lista de etapas con algún valor inválido descarta solo el inválido", async () => {
    render(
      await AdminPipelinePage({
        searchParams: Promise.resolve({ etapa: "en_contacto,no-existe" }),
      })
    );
    expect(mockFindManyLead).toHaveBeenCalledWith(expect.objectContaining({ where: { etapa: "en_contacto" } }));
  });

  it("desde=hoy filtra por createdAt desde el inicio del día", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({ etapa: "nuevo", desde: "hoy" }) }));
    const call = mockFindManyLead.mock.calls[0][0];
    expect(call.where.etapa).toBe("nuevo");
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
  });

  it("periodo=mes filtra por createdAt desde el inicio del mes", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({ etapa: "ganado", periodo: "mes" }) }));
    const call = mockFindManyLead.mock.calls[0][0];
    expect(call.where.etapa).toBe("ganado");
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
  });

  it("sinContactar=1 filtra por contactado: false (deep link de la alerta 'leads sin contactar')", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({ sinContactar: "1" }) }));
    expect(mockFindManyLead).toHaveBeenCalledWith(expect.objectContaining({ where: { contactado: false } }));
  });

  it("el selector de vendedor carga tanto rol vendedor como admin, ambos activos", async () => {
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(mockFindManyVendedor).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rol: { in: ["vendedor", "admin"] }, activo: true } })
    );
  });

  it("calcula la tasa de conversión del mes como porcentaje redondeado", async () => {
    mockCountLead.mockImplementation(async (args: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      if (where.etapa === "ganado" && where.createdAt) return 3; // ganadosMes
      if (where.createdAt && !where.etapa) return 10; // totalMes
      return 0;
    });
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("muestra '—' en la conversión cuando no hubo ningún lead este mes", async () => {
    mockCountLead.mockResolvedValue(0); // totalMes también queda en 0 → tasaConversion devuelve null
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Conversión del mes").previousElementSibling?.textContent).toBe("—");
  });

  it("pasa el rol de la sesión a PipelineBoard (default 'vendedor' sin sesión)", async () => {
    mockFindManyLead.mockResolvedValueOnce([LEAD]);
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/rol=admin/)).toBeInTheDocument();
  });

  it("sin sesión, el rol pasado a PipelineBoard cae a 'vendedor'", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    mockFindManyLead.mockResolvedValueOnce([LEAD]);
    render(await AdminPipelinePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/rol=vendedor/)).toBeInTheDocument();
  });
});
