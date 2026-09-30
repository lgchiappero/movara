import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  mockFindUnique,
  mockFindManyCliente,
  mockFindManyEnvio,
  mockFindManyAcuerdo,
  mockNotFound,
  mockGetSignedUrl,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindManyCliente: vi.fn().mockResolvedValue([]),
  mockFindManyEnvio: vi.fn().mockResolvedValue([]),
  mockFindManyAcuerdo: vi.fn().mockResolvedValue([]),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/doc.pdf"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    unidad: { findUnique: mockFindUnique },
    cliente: { findMany: mockFindManyCliente },
    envio: { findMany: mockFindManyEnvio },
    acuerdoPago: { findMany: mockFindManyAcuerdo },
  },
}));
vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/lib/admin/storage", () => ({ getSignedUrl: mockGetSignedUrl, BUCKET_MOVARA: "documentos-movara" }));
vi.mock("@/components/admin/UnidadDetailForm", () => ({ default: () => <div>UnidadDetailForm</div> }));
vi.mock("@/components/admin/DocumentosPorSeccion", () => ({
  default: ({ uploadUrl, documentos }: { uploadUrl: string; documentos: unknown[] }) => (
    <div>
      {uploadUrl} — {documentos.length} docs
    </div>
  ),
}));
vi.mock("@/components/admin/CobranzaUnidadSection", () => ({
  default: ({ acuerdos }: { acuerdos: unknown[] }) => <div>CobranzaUnidadSection: {acuerdos.length}</div>,
}));

import UnidadDetailPage from "../page";

const UNIDAD_BASE = {
  id: "u1",
  numeroUnidad: "MOV-UNIDAD-2026-001",
  cliente: { id: "c1", nombre: "Juan García" },
  envio: null,
  documentos: [],
  configuracion: null,
  modelo: null,
  precioCliente: null,
  estadoFabricacion: "pendiente",
  provinciaDestino: null,
  localidadDestino: null,
  direccionEntrega: null,
  costoTransporteNacional: null,
  costoGrua: null,
  fechaEntregaEstimada: null,
  fechaEntrega: null,
  garantiaActivada: false,
  garantiaInicio: null,
  garantiaFin: null,
  notas: null,
  clienteId: "c1",
  envioId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("UnidadDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyCliente.mockResolvedValue([]);
    mockFindManyEnvio.mockResolvedValue([]);
    mockFindManyAcuerdo.mockResolvedValue([]);
  });

  it("notFound() si la unidad no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(UnidadDetailPage({ params: Promise.resolve({ id: "no-existe" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("título alternativo cuando no hay número de unidad", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...UNIDAD_BASE, numeroUnidad: null });
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByText("Unidad sin número")).toBeInTheDocument();
  });

  it("muestra el número de unidad y el link al cliente", async () => {
    mockFindUnique.mockResolvedValueOnce(UNIDAD_BASE);
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByText("MOV-UNIDAD-2026-001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Juan García" })).toHaveAttribute("href", "/admin/clientes/c1");
  });

  it("línea de tiempo: unidad sin modelo/precio muestra 'Unidad creada' como paso actual con su acción", async () => {
    mockFindUnique.mockResolvedValueOnce(UNIDAD_BASE);
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByText("Venta cerrada")).toBeInTheDocument();
    expect(screen.getByText("Unidad creada")).toBeInTheDocument();
    expect(screen.getByText("Cobro anticipo")).toBeInTheDocument();
    expect(screen.getByText("En producción")).toBeInTheDocument();
    expect(screen.getByText("Entregado")).toBeInTheDocument();
    expect(screen.getByText("⚡ Próximo paso:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Completar modelo y precio de la unidad/ })).toHaveAttribute(
      "href",
      "#datos-unidad"
    );
  });

  it("línea de tiempo: con modelo, precio y un cobro registrado, 'En producción' pasa a ser el paso actual", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...UNIDAD_BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      estadoFabricacion: "en_produccion",
    });
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        id: "a1",
        unidadId: "u1",
        unidad: { numeroUnidad: "MOV-UNIDAD-2026-001", modelo: "Flex 18", estadoFabricacion: "pendiente", cliente: { id: "c1", nombre: "Juan García" } },
        tipo: "cobro",
        concepto: "venta",
        descripcion: null,
        contraparte: "Juan García",
        moneda: "USD",
        totalAcordado: 50000,
        notas: null,
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        cuotas: [],
        movimientos: [
          // 2 pagos fuera de orden cronológico — ejercita el comparador del
          // sort que busca el más antiguo (primerCobroFecha).
          { id: "m2", fecha: new Date("2026-01-20T00:00:00.000Z"), importe: 10000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
          { id: "m1", fecha: new Date("2026-01-10T00:00:00.000Z"), importe: 15000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
        ],
      },
    ]);
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByRole("link", { name: /Registrar pago primera cuota a fábrica/ })).toHaveAttribute(
      "href",
      "#cobranza"
    );
    expect(screen.getByRole("link", { name: /Subir PI en carpeta 04/ })).toHaveAttribute("href", "#datos-unidad");
  });

  it("línea de tiempo: con envío vinculado, la acción de carpeta 04 apunta al detalle del envío", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...UNIDAD_BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      estadoFabricacion: "en_produccion",
      envioId: "e1",
    });
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        id: "a1",
        unidadId: "u1",
        unidad: { numeroUnidad: "MOV-UNIDAD-2026-001", modelo: "Flex 18", estadoFabricacion: "pendiente", cliente: { id: "c1", nombre: "Juan García" } },
        tipo: "cobro",
        concepto: "venta",
        descripcion: null,
        contraparte: "Juan García",
        moneda: "USD",
        totalAcordado: 50000,
        notas: null,
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        cuotas: [],
        movimientos: [
          { id: "m1", fecha: new Date("2026-01-10T00:00:00.000Z"), importe: 15000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
        ],
      },
    ]);
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByRole("link", { name: /Subir PI en carpeta 04/ })).toHaveAttribute(
      "href",
      "/admin/envios/e1#seccion-04_produccion"
    );
  });

  it("línea de tiempo: unidad completamente entregada no muestra ningún paso actual", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...UNIDAD_BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      estadoFabricacion: "entregado",
      fechaEntrega: new Date("2026-06-01T00:00:00.000Z"),
      envio: { id: "e1", numeroPI: "PI-001", fechaEmbarque: new Date("2026-03-01T00:00:00.000Z"), documentos: [] },
    });
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        id: "a1",
        unidadId: "u1",
        unidad: { numeroUnidad: "MOV-UNIDAD-2026-001", modelo: "Flex 18", estadoFabricacion: "entregado", cliente: { id: "c1", nombre: "Juan García" } },
        tipo: "cobro",
        concepto: "venta",
        descripcion: null,
        contraparte: "Juan García",
        moneda: "USD",
        totalAcordado: 50000,
        notas: null,
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        cuotas: [],
        movimientos: [
          { id: "m1", fecha: new Date("2026-01-10T00:00:00.000Z"), importe: 50000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
        ],
      },
    ]);
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.queryByText("⚡ Próximo paso:")).not.toBeInTheDocument();
  });

  it("pasa la lista de envíos disponibles (serializados) al formulario de detalle", async () => {
    mockFindManyEnvio.mockResolvedValueOnce([
      { id: "e1", numeroPI: "PI-001", numeroContenedor: "CONT-1", fechaArriboEstimado: new Date("2026-06-01T00:00:00.000Z") },
    ]);
    mockFindUnique.mockResolvedValueOnce(UNIDAD_BASE);
    // No debería tirar al serializar fechaArriboEstimado a ISO string.
    expect(async () => render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }))).not.toThrow();
  });

  it("sin envío asignado: muestra el mensaje explicativo y no consulta documentos del envío", async () => {
    mockFindUnique.mockResolvedValueOnce(UNIDAD_BASE);
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByText(/todavía no está asignada a ningún envío/i)).toBeInTheDocument();
  });

  it("con envío asignado pero sin documentos: muestra el mensaje correspondiente", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...UNIDAD_BASE,
      envio: { id: "e1", numeroPI: "PI-001", documentos: [] },
    });
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByText(/el envío todavía no tiene documentos/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir al envío pi-001/i })).toHaveAttribute("href", "/admin/envios/e1");
  });

  it("con documentos del envío: los agrupa por sección y resuelve sus URLs firmadas", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...UNIDAD_BASE,
      envio: {
        id: "e1",
        numeroPI: "PI-001",
        documentos: [
          { id: "d1", seccion: "05_embarque", nombre: "bl.pdf", descripcion: null, subidoPor: "a@x.com", createdAt: new Date(), url: "envios/e1/bl.pdf" },
        ],
      },
    });
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(mockGetSignedUrl).toHaveBeenCalledWith("documentos-movara", "envios/e1/bl.pdf");
    expect(screen.getByText("bl.pdf")).toBeInTheDocument();
    expect(screen.getByText("Ver")).toBeInTheDocument();
  });

  it("documento del envío sin URL firmada muestra 'No disponible'", async () => {
    mockGetSignedUrl.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce({
      ...UNIDAD_BASE,
      envio: {
        id: "e1",
        numeroPI: null,
        documentos: [
          { id: "d1", seccion: "05_embarque", nombre: "bl.pdf", descripcion: null, subidoPor: "a@x.com", createdAt: new Date(), url: "envios/e1/bl.pdf" },
        ],
      },
    });
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByText("No disponible")).toBeInTheDocument();
  });

  it("pasa los documentos propios de la unidad a DocumentosPorSeccion", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...UNIDAD_BASE,
      documentos: [
        { id: "d1", seccion: "01_cliente", nombre: "dni.pdf", descripcion: null, subidoPor: "a@x.com", createdAt: new Date(), url: "unidades/u1/dni.pdf" },
      ],
    });
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(screen.getByText("/api/admin/unidades/u1/documentos — 1 docs")).toBeInTheDocument();
  });

  it("consulta los acuerdos de cobranza de la unidad y los pasa serializados a CobranzaUnidadSection", async () => {
    mockFindUnique.mockResolvedValueOnce(UNIDAD_BASE);
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        id: "a1",
        unidadId: "u1",
        unidad: {
          numeroUnidad: "MOV-UNIDAD-2026-001",
          modelo: "Flex 18",
          estadoFabricacion: "pendiente",
          cliente: { id: "c1", nombre: "Juan García" },
        },
        tipo: "cobro",
        concepto: "venta",
        descripcion: null,
        contraparte: "Juan García",
        moneda: "USD",
        totalAcordado: 50000,
        notas: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        cuotas: [],
        movimientos: [],
      },
    ]);
    render(await UnidadDetailPage({ params: Promise.resolve({ id: "u1" }) }));
    expect(mockFindManyAcuerdo).toHaveBeenCalledWith(expect.objectContaining({ where: { unidadId: "u1" } }));
    expect(screen.getByText("CobranzaUnidadSection: 1")).toBeInTheDocument();
  });
});
