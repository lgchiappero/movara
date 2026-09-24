import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindManyUnidad, mockFindManyCliente, mockFindManyEnvio } = vi.hoisted(() => ({
  mockFindManyUnidad: vi.fn(),
  mockFindManyCliente: vi.fn().mockResolvedValue([]),
  mockFindManyEnvio: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db", () => ({
  db: {
    unidad: { findMany: mockFindManyUnidad },
    cliente: { findMany: mockFindManyCliente },
    envio: { findMany: mockFindManyEnvio },
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/NuevaUnidadForm", () => ({ default: () => <div>NuevaUnidadForm</div> }));

import AdminUnidadesPage from "../page";

describe("AdminUnidadesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // db.unidad.findMany se usa 2 veces en la página (lista + distinct de
    // provincias) — este default cubre la 2da llamada cuando el test solo
    // le importa la 1ra (vía mockResolvedValueOnce).
    mockFindManyUnidad.mockResolvedValue([]);
    mockFindManyCliente.mockResolvedValue([]);
    mockFindManyEnvio.mockResolvedValue([]);
  });

  it("muestra el mensaje genérico de vacío sin filtros", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([]);
    render(
      await AdminUnidadesPage({ searchParams: Promise.resolve({}) })
    );
    expect(screen.getByText("Todavía no hay unidades cargadas.")).toBeInTheDocument();
    expect(screen.queryByText("Limpiar filtros")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de 'sin coincidencias' cuando hay filtros activos y no hay resultados", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([]);
    render(
      await AdminUnidadesPage({ searchParams: Promise.resolve({ estado: "pendiente" }) })
    );
    expect(screen.getByText("Ninguna unidad coincide con los filtros.")).toBeInTheDocument();
    expect(screen.getByText("Limpiar filtros")).toBeInTheDocument();
  });

  it("aplica los 4 filtros al where de la query", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([]);
    await AdminUnidadesPage({
      searchParams: Promise.resolve({
        estado: "pendiente",
        clienteId: "c1",
        envioId: "e1",
        provincia: "Córdoba",
      }),
    });
    expect(mockFindManyUnidad).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { estadoFabricacion: "pendiente", clienteId: "c1", envioId: "e1", provinciaDestino: "Córdoba" },
      })
    );
  });

  it("renderiza las opciones de los 3 selectores (cliente/envío/provincia) a partir de la data real", async () => {
    mockFindManyCliente.mockResolvedValueOnce([{ id: "c1", nombre: "Juan García" }]);
    mockFindManyEnvio.mockResolvedValueOnce([{ id: "e1", numeroPI: "PI-001" }]);
    mockFindManyUnidad.mockReset();
    mockFindManyUnidad.mockResolvedValueOnce([]); // lista principal
    mockFindManyUnidad.mockResolvedValueOnce([{ provinciaDestino: "Córdoba" }]); // distinct provincias
    render(await AdminUnidadesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("option", { name: "Juan García" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PI-001" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Córdoba" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PI-001" })).toBeInTheDocument();
  });

  it("un envío sin numeroPI en el selector usa el fallback 'Envío ' + sufijo del id", async () => {
    mockFindManyEnvio.mockResolvedValueOnce([{ id: "abcdef123456", numeroPI: null }]);
    render(await AdminUnidadesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("option", { name: "Envío 123456" })).toBeInTheDocument();
  });

  it("lista las unidades con destino, precio y fallback '—' cuando faltan datos", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([
      {
        id: "u1",
        numeroUnidad: "MOV-UNIDAD-2026-001",
        modelo: "Flex 18",
        estadoFabricacion: "pendiente",
        localidadDestino: "Bariloche",
        provinciaDestino: "Río Negro",
        precioCliente: 50000,
        cliente: { nombre: "Juan" },
        envio: { numeroPI: "PI-001" },
      },
      {
        id: "u2",
        numeroUnidad: null,
        modelo: null,
        estadoFabricacion: "pendiente",
        localidadDestino: null,
        provinciaDestino: null,
        precioCliente: null,
        cliente: { nombre: "Ana" },
        envio: null,
      },
    ]);
    render(await AdminUnidadesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Bariloche, Río Negro")).toBeInTheDocument();
    expect(screen.getByText("USD 50.000")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
