import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindUnique, mockFindManyCliente, mockFindManyEnvio, mockNotFound, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindManyCliente: vi.fn().mockResolvedValue([]),
  mockFindManyEnvio: vi.fn().mockResolvedValue([]),
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
};

describe("UnidadDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyCliente.mockResolvedValue([]);
    mockFindManyEnvio.mockResolvedValue([]);
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
});
