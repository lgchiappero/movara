import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindUnique, mockNotFound, mockGetAdminUser, mockLeads, mockCitas } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockLeads: vi.fn().mockResolvedValue([]),
  mockCitas: vi.fn().mockResolvedValue([]),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockGetAdminUser: vi.fn().mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" }),
}));

vi.mock("@/lib/db", () => ({
  db: { cliente: { findUnique: mockFindUnique }, lead: { findMany: mockLeads }, cita: { findMany: mockCitas } },
}));
vi.mock("@/components/admin/EstadoClienteSelector", () => ({
  default: ({ estado, estadoManual }: { estado: string; estadoManual: boolean }) => (
    <div>
      EstadoClienteSelector {estado} manual={String(estadoManual)}
    </div>
  ),
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/ClienteDetailForm", () => ({
  default: ({ initial }: { initial: { nombre: string } }) => <div>Form: {initial.nombre}</div>,
}));
vi.mock("@/components/admin/EliminarClienteButton", () => ({
  default: ({ cantidadUnidades }: { cantidadUnidades: number }) => (
    <div>EliminarClienteButton cantidadUnidades={cantidadUnidades}</div>
  ),
}));

import ClienteDetailPage from "../page";

const CLIENTE = {
  id: "c1",
  nombre: "Juan García",
  dni: null,
  cuit: null,
  domicilio: null,
  email: null,
  telefono: null,
  notas: null,
  razonSocial: null,
  nombreContacto: null,
  provincia: null,
  localidad: null,
  estado: "interesado",
  estadoManual: false,
  estadoManualEn: null,
  estadoManualPor: null,
  estadoAutomatico: "interesado",
  origenVisita: null,
  campana: null,
  unidades: [],
  pedidos: [],
};

describe("ClienteDetailPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama a notFound() si el cliente no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(ClienteDetailPage({ params: Promise.resolve({ id: "no-existe" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("muestra el estado vacío cuando el cliente no tiene unidades", async () => {
    mockFindUnique.mockResolvedValueOnce(CLIENTE);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText(/todavía no tiene unidades/i)).toBeInTheDocument();
  });

  it("lista las unidades del cliente con su estado y PI del envío si tiene", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...CLIENTE,
      unidades: [
        {
          id: "u1",
          numeroUnidad: "MOV-UNIDAD-2026-001",
          modelo: "Flex 18",
          estadoFabricacion: "en_produccion",
          envio: { numeroPI: "PI-001" },
          recibos: [],
        },
        {
          id: "u2",
          numeroUnidad: null,
          modelo: null,
          estadoFabricacion: "pendiente",
          envio: null,
          recibos: [],
        },
      ],
    });
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText("Unidades (2)")).toBeInTheDocument();
    expect(screen.getByText("MOV-UNIDAD-2026-001")).toBeInTheDocument();
    expect(screen.getByText(/PI PI-001/)).toBeInTheDocument();
    expect(screen.getByText("Sin número")).toBeInTheDocument();
    expect(screen.getByText("Modelo sin definir")).toBeInTheDocument();
  });

  it("rol admin ve el botón de eliminar con la cantidad de unidades", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CLIENTE, unidades: [{ recibos: [] }, { recibos: [] }] });
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText("EliminarClienteButton cantidadUnidades=2")).toBeInTheDocument();
  });

  it("rol vendedor no ve el botón de eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u2", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    mockFindUnique.mockResolvedValueOnce(CLIENTE);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.queryByText(/EliminarClienteButton/)).not.toBeInTheDocument();
  });

  it("sin sesión no rompe y no muestra el botón de eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce(CLIENTE);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.queryByText(/EliminarClienteButton/)).not.toBeInTheDocument();
  });

  it("muestra el estado, el origen web, los pedidos y las consultas (leads y visitas)", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...CLIENTE,
      email: "juan@x.com",
      estado: "pedido_iniciado",
      estadoManualEn: new Date("2026-10-20T00:00:00Z"),
      origenVisita: "instagram",
      campana: "bio",
      pedidos: [
        { id: "p1", numeroConsulta: "MOV-CONSULTA-2026-010", numeroPedido: null, modelo: "40ft", estadoPedido: "consulta", createdAt: new Date("2026-10-25T00:00:00Z") },
        { id: "p2", numeroConsulta: "MOV-CONSULTA-2026-002", numeroPedido: "MOV-2026-001", modelo: null, estadoPedido: "cancelado", createdAt: new Date("2026-10-01T00:00:00Z") },
        { id: "p3", numeroConsulta: null, numeroPedido: null, modelo: null, estadoPedido: "consulta", createdAt: new Date("2026-10-01T00:00:00Z") },
      ],
    });
    mockLeads.mockResolvedValueOnce([
      { id: "l1", etapa: "en_contacto", mensaje: "Quiero info del 40", createdAt: new Date("2026-10-24T00:00:00Z") },
      { id: "l2", etapa: "raro", mensaje: null, createdAt: new Date("2026-10-24T00:00:00Z") },
    ]);
    mockCitas.mockResolvedValueOnce([{ id: "ci1", fecha: new Date("2026-11-02T00:00:00Z"), horario: "10:00", estado: "confirmada" }]);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));

    expect(screen.getByText("EstadoClienteSelector pedido_iniciado manual=false")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("Pedidos (3)")).toBeInTheDocument();
    expect(screen.getByText("MOV-CONSULTA-2026-010").closest("a")).toHaveAttribute("href", "/admin/configuraciones/p1");
    expect(screen.getByText("MOV-2026-001")).toBeInTheDocument();
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
    expect(screen.getByText("Consultas (3)")).toBeInTheDocument();
    expect(screen.getByText("Quiero info del 40")).toBeInTheDocument();
    expect(screen.getByText("En contacto")).toBeInTheDocument();
    expect(screen.getByText("raro")).toBeInTheDocument();
    expect(screen.getByText(/Visita al showroom · 2\/11\/2026 10:00hs/)).toBeInTheDocument();
    expect(mockCitas).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: { equals: "juan@x.com", mode: "insensitive" } } })
    );
  });

  it("sin pedidos ni consultas muestra los vacíos, y sin email no busca visitas", async () => {
    mockFindUnique.mockResolvedValueOnce(CLIENTE);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText(/todavía no tiene pedidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin consultas registradas/)).toBeInTheDocument();
    expect(mockCitas).not.toHaveBeenCalled();
  });
});
