import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindUnique, mockFindManyUnidad, mockNotFound, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindManyUnidad: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/doc.pdf"),
}));

vi.mock("@/lib/db", () => ({
  db: { envio: { findUnique: mockFindUnique }, unidad: { findMany: mockFindManyUnidad } },
}));
vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/lib/admin/storage", () => ({ getSignedUrl: mockGetSignedUrl, BUCKET_MOVARA: "documentos-movara" }));
vi.mock("@/components/admin/EnvioDetailForm", () => ({ default: () => <div>EnvioDetailForm</div> }));
vi.mock("@/components/admin/AgregarUnidadSelector", () => ({
  default: ({ unidadesDisponibles }: { unidadesDisponibles: unknown[] }) => (
    <div>Disponibles: {unidadesDisponibles.length}</div>
  ),
}));
vi.mock("@/components/admin/UnidadEnvioRow", () => ({
  default: ({ unidad }: { unidad: { numeroUnidad: string | null } }) => <div>Fila: {unidad.numeroUnidad}</div>,
}));
vi.mock("@/components/admin/DocumentosPorSeccion", () => ({
  default: ({ documentos }: { documentos: unknown[] }) => <div>Documentos: {documentos.length}</div>,
}));

import EnvioDetailPage from "../page";

const ENVIO_BASE = {
  id: "e1",
  numeroPI: "PI-001",
  unidades: [],
  documentos: [],
};

describe("EnvioDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyUnidad.mockResolvedValue([]);
  });

  it("notFound() si el envío no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(EnvioDetailPage({ params: Promise.resolve({ id: "no-existe" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("título alternativo cuando no hay PI cargado", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...ENVIO_BASE, numeroPI: null });
    render(await EnvioDetailPage({ params: Promise.resolve({ id: "e1" }) }));
    expect(screen.getByText("Envío sin PI cargado")).toBeInTheDocument();
  });

  it("título con el número de PI cuando está cargado", async () => {
    mockFindUnique.mockResolvedValueOnce(ENVIO_BASE);
    render(await EnvioDetailPage({ params: Promise.resolve({ id: "e1" }) }));
    expect(screen.getByText("Envío PI-001")).toBeInTheDocument();
  });

  it("pasa las unidades sin envío asignado al selector de agregar", async () => {
    mockFindUnique.mockResolvedValueOnce(ENVIO_BASE);
    mockFindManyUnidad.mockResolvedValueOnce([{ id: "u1", numeroUnidad: null, cliente: { nombre: "Juan" } }]);
    render(await EnvioDetailPage({ params: Promise.resolve({ id: "e1" }) }));
    expect(screen.getByText("Disponibles: 1")).toBeInTheDocument();
    expect(mockFindManyUnidad).toHaveBeenCalledWith(
      expect.objectContaining({ where: { envioId: null } })
    );
  });

  it("muestra el mensaje de 'sin unidades asignadas' cuando el envío está vacío", async () => {
    mockFindUnique.mockResolvedValueOnce(ENVIO_BASE);
    render(await EnvioDetailPage({ params: Promise.resolve({ id: "e1" }) }));
    expect(screen.getByText(/todavía no hay unidades asignadas/i)).toBeInTheDocument();
  });

  it("renderiza una fila por cada unidad asignada", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...ENVIO_BASE,
      unidades: [
        { id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", modelo: "Flex 18", estadoFabricacion: "pendiente", cliente: { nombre: "Juan" } },
      ],
    });
    render(await EnvioDetailPage({ params: Promise.resolve({ id: "e1" }) }));
    expect(screen.getByText("Fila: MOV-UNIDAD-2026-001")).toBeInTheDocument();
  });

  it("resuelve las URLs firmadas de los documentos del envío", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...ENVIO_BASE,
      documentos: [
        { id: "d1", seccion: "05_embarque", nombre: "bl.pdf", descripcion: null, subidoPor: "a@x.com", createdAt: new Date(), url: "envios/e1/bl.pdf" },
      ],
    });
    render(await EnvioDetailPage({ params: Promise.resolve({ id: "e1" }) }));
    expect(mockGetSignedUrl).toHaveBeenCalledWith("documentos-movara", "envios/e1/bl.pdf");
    expect(screen.getByText("Documentos: 1")).toBeInTheDocument();
  });
});
