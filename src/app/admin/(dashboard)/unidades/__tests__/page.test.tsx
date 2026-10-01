import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindManyUnidad, mockCountUnidad, mockFindManyCliente, mockFindManyEnvio, mockFindManyMovimiento } =
  vi.hoisted(() => ({
    mockFindManyUnidad: vi.fn(),
    mockCountUnidad: vi.fn().mockResolvedValue(0),
    mockFindManyCliente: vi.fn().mockResolvedValue([]),
    mockFindManyEnvio: vi.fn().mockResolvedValue([]),
    mockFindManyMovimiento: vi.fn().mockResolvedValue([]),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    unidad: { findMany: mockFindManyUnidad, count: mockCountUnidad },
    cliente: { findMany: mockFindManyCliente },
    envio: { findMany: mockFindManyEnvio },
    movimiento: { findMany: mockFindManyMovimiento },
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
    mockCountUnidad.mockResolvedValue(0);
    mockFindManyCliente.mockResolvedValue([]);
    mockFindManyEnvio.mockResolvedValue([]);
    mockFindManyMovimiento.mockResolvedValue([]);
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

  it("estado=activo (sintético) filtra por estadoFabricacion distinto de entregado", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([]);
    await AdminUnidadesPage({ searchParams: Promise.resolve({ estado: "activo" }) });
    expect(mockFindManyUnidad).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estadoFabricacion: { not: "entregado" } } })
    );
  });

  it("periodo=mes agrega el filtro de fechaEntrega desde el inicio del mes", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([]);
    await AdminUnidadesPage({ searchParams: Promise.resolve({ estado: "entregado", periodo: "mes" }) });
    const call = mockFindManyUnidad.mock.calls[0][0];
    expect(call.where.estadoFabricacion).toBe("entregado");
    expect(call.where.fechaEntrega.gte).toBeInstanceOf(Date);
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
        clienteId: "c1",
        numeroUnidad: "MOV-UNIDAD-2026-001",
        modelo: "Flex 18",
        estadoFabricacion: "pendiente",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        fechaEntrega: null,
        localidadDestino: "Bariloche",
        provinciaDestino: "Río Negro",
        precioCliente: 50000,
        cliente: { nombre: "Juan" },
        envio: { numeroPI: "PI-001", fechaEmbarque: null },
      },
      {
        id: "u2",
        clienteId: null,
        numeroUnidad: null,
        modelo: null,
        estadoFabricacion: "pendiente",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        fechaEntrega: null,
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

  it("muestra la columna 'Próximo paso' derivada de la lógica de la línea de tiempo", async () => {
    // u1: cobro de anticipo registrado pero sin pago a fábrica.
    // u2: cobro y pago a fábrica registrados.
    mockFindManyMovimiento.mockResolvedValueOnce([
      { fecha: new Date("2026-01-05T00:00:00.000Z"), importe: 15000, acuerdo: { unidadId: "u1", tipo: "cobro", moneda: "USD", concepto: "venta" } },
      { fecha: new Date("2026-01-05T00:00:00.000Z"), importe: 20000, acuerdo: { unidadId: "u2", tipo: "cobro", moneda: "USD", concepto: "venta" } },
      { fecha: new Date("2026-01-08T00:00:00.000Z"), importe: 9000, acuerdo: { unidadId: "u2", tipo: "pago", moneda: "USD", concepto: "fabrica" } },
    ]);
    mockFindManyUnidad.mockResolvedValueOnce([
      {
        id: "u1",
        clienteId: "c1",
        numeroUnidad: "MOV-UNIDAD-2026-001",
        modelo: "Flex 18",
        estadoFabricacion: "en_produccion",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        fechaEntrega: null,
        localidadDestino: null,
        provinciaDestino: null,
        precioCliente: 50000,
        cliente: { nombre: "Juan" },
        envio: { numeroPI: "PI-001", fechaEmbarque: null },
      },
      {
        id: "u2",
        clienteId: "c2",
        numeroUnidad: "MOV-UNIDAD-2026-002",
        modelo: "Flex 20",
        estadoFabricacion: "entregado",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        // fechaEntrega ausente a propósito: el estado real ya es "entregado"
        // pero sin la fecha registrada el paso "Entregado" sigue siendo el
        // actual (gating por calidad de dato) → acción "Activar garantía".
        fechaEntrega: null,
        localidadDestino: null,
        provinciaDestino: null,
        precioCliente: 60000,
        cliente: { nombre: "Ana" },
        envio: { numeroPI: "PI-002", fechaEmbarque: new Date("2026-01-15T00:00:00.000Z") },
      },
    ]);
    render(await AdminUnidadesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Registrar pago a fábrica")).toBeInTheDocument();
    expect(screen.getByText("Activar garantía")).toBeInTheDocument();
  });

  it("muestra 'Cobrado' (suma de cobros en USD) y 'Fecha último cobro' por unidad", async () => {
    mockFindManyMovimiento.mockResolvedValueOnce([
      { fecha: new Date("2026-01-05T00:00:00.000Z"), importe: 15000, acuerdo: { unidadId: "u1", tipo: "cobro", moneda: "USD", concepto: "venta" } },
      { fecha: new Date("2026-02-20T00:00:00.000Z"), importe: 7500, acuerdo: { unidadId: "u1", tipo: "cobro", moneda: "USD", concepto: "venta" } },
      { fecha: new Date("2026-02-25T00:00:00.000Z"), importe: 9000, acuerdo: { unidadId: "u1", tipo: "pago", moneda: "USD", concepto: "fabrica" } },
    ]);
    mockFindManyUnidad.mockResolvedValueOnce([
      {
        id: "u1",
        clienteId: "c1",
        numeroUnidad: "MOV-UNIDAD-2026-001",
        modelo: "Flex 18",
        estadoFabricacion: "en_produccion",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        fechaEntrega: null,
        localidadDestino: null,
        provinciaDestino: null,
        precioCliente: 50000,
        cliente: { nombre: "Juan" },
        envio: null,
      },
      {
        id: "u2",
        clienteId: "c2",
        numeroUnidad: "MOV-UNIDAD-2026-002",
        modelo: "Flex 38",
        estadoFabricacion: "pendiente",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        fechaEntrega: null,
        localidadDestino: null,
        provinciaDestino: null,
        precioCliente: 60000,
        cliente: { nombre: "Ana" },
        envio: null,
      },
    ]);
    render(await AdminUnidadesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("columnheader", { name: "Cobrado" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Fecha último cobro" })).toBeInTheDocument();
    const filaU1 = screen.getByText("MOV-UNIDAD-2026-001").closest("tr")!;
    expect(filaU1).toHaveTextContent("USD 22.500");
    expect(filaU1).toHaveTextContent("20/2/2026");
    const filaU2 = screen.getByText("MOV-UNIDAD-2026-002").closest("tr")!;
    expect(filaU2).toHaveTextContent("USD 0");
    expect(filaU2).toHaveTextContent("Cobrar anticipo");
  });

  it("pagina de a 50: pasa take/skip correctos y expone Anterior/Siguiente preservando todos los filtros", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([]); // lista principal (página 2)
    mockCountUnidad.mockResolvedValueOnce(120); // total con el filtro aplicado → 3 páginas
    mockFindManyUnidad.mockResolvedValueOnce([]); // distinct provincias
    render(
      await AdminUnidadesPage({
        searchParams: Promise.resolve({
          estado: "pendiente",
          clienteId: "c1",
          envioId: "e1",
          provincia: "Córdoba",
          periodo: "mes",
          page: "2",
        }),
      })
    );
    const call = mockFindManyUnidad.mock.calls[0][0];
    expect(call.take).toBe(50);
    expect(call.skip).toBe(50); // (page 2 - 1) * 50
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /anterior/i })).toHaveAttribute(
      "href",
      "/admin/unidades?estado=pendiente&clienteId=c1&envioId=e1&provincia=C%C3%B3rdoba&periodo=mes"
    );
    expect(screen.getByRole("link", { name: /siguiente/i })).toHaveAttribute(
      "href",
      "/admin/unidades?estado=pendiente&clienteId=c1&envioId=e1&provincia=C%C3%B3rdoba&periodo=mes&page=3"
    );
  });

  it("page inválido (no numérico) cae a la página 1", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([]);
    render(await AdminUnidadesPage({ searchParams: Promise.resolve({ page: "no-es-numero" }) }));
    const call = mockFindManyUnidad.mock.calls[0][0];
    expect(call.skip).toBe(0);
  });

  it("con 1 sola página no se muestra ningún control de paginación", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([{ id: "u1", numeroUnidad: null, modelo: null, estadoFabricacion: "pendiente", localidadDestino: null, provinciaDestino: null, precioCliente: null, cliente: { nombre: "Juan" }, envio: null }]);
    mockCountUnidad.mockResolvedValueOnce(1);
    render(await AdminUnidadesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(/página 1 de/i)).not.toBeInTheDocument();
  });
});
