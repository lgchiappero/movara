import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindUnique, mockFindManyUsers, mockFindManyDocs, mockNotFound, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindManyUsers: vi.fn().mockResolvedValue([]),
  mockFindManyDocs: vi.fn().mockResolvedValue([]),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/x"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    configuracionPedido: { findUnique: mockFindUnique },
    adminUser: { findMany: mockFindManyUsers },
    documentoPedido: { findMany: mockFindManyDocs },
  },
}));
vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));
vi.mock("@/lib/admin/storage", () => ({ getSignedUrl: mockGetSignedUrl, BUCKET_PEDIDOS: "documentos-pedidos" }));
vi.mock("@/components/admin/GestionPedidoPanel", () => ({ default: () => <div>GestionPedidoPanel</div> }));
vi.mock("@/components/admin/DocumentosPedidoSection", () => ({
  default: ({ documentos }: { documentos: unknown[] }) => <div>Documentos: {documentos.length}</div>,
}));
vi.mock("@/components/admin/ConfiguracionEspacioForm", () => ({ default: () => <div>ConfiguracionEspacioForm</div> }));

import ConfiguracionDetailPage from "../page";

const CONFIG_BASE = {
  id: "p1",
  clienteNombre: "Juan García",
  clienteEmail: null,
  clienteWhatsapp: null,
  numeroConsulta: "MOV-CONSULTA-2026-001",
  numeroPedido: null,
  estadoPedido: "consulta",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  modelo: null,
  finalidad: null,
  provincia: null,
  localidad: null,
  habitaciones: null,
  incluyeCocina: true,
  tipoCocina: null,
  incluyeBano: true,
  tipoAgua: null,
  lavarropas: null,
  materiales: null,
  upgrades: [],
  notasConfiguracion: null,
  precioFinal: null,
  anticipo: null,
  numeroFabrica: null,
  numeroContenedor: null,
  numeroBL: null,
  fechaConfirmacion: null,
  fechaProduccion: null,
  fechaDespacho: null,
  fechaArriboEstimado: null,
  fechaEntrega: null,
  notasInternas: null,
  notasCliente: null,
  costoProveedor: null,
  costoFlete: null,
  costoAduana: null,
  costoOtros: null,
  vendedorAsignado: null,
  piProveedor: null,
  piUrl: null,
  fechaPIPagado: null,
  montoPI: null,
  comprobantePagoUrl: null,
  comprobanteSaldoUrl: null,
  seguroTransporte: false,
  seguroUrl: null,
  inspeccionFabrica: false,
  inspeccionUrl: null,
  fotosDespachadas: false,
  fotosUrl: null,
  notasDespachador: null,
  gastosDespachante: null,
  impuestosAduana: null,
  gastosPortuarios: null,
  costoGruaDescarga: null,
  costoTransporteLocal: null,
  instalacionFecha: null,
  instalacionNotas: null,
  satisfaccionCliente: null,
  garantiaActivada: false,
  garantiaFechaInicio: null,
  garantiaFechaFin: null,
};

describe("ConfiguracionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyUsers.mockResolvedValue([]);
    mockFindManyDocs.mockResolvedValue([]);
    mockGetSignedUrl.mockResolvedValue("https://signed.example/x");
  });

  it("notFound() si la configuración no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(ConfiguracionDetailPage({ params: Promise.resolve({ id: "no-existe" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("renderiza el nombre del cliente, el estado y el link de descarga de PDF", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /descargar pdf/i })).toHaveAttribute(
      "href",
      "/api/admin/configuraciones/p1/pdf"
    );
  });

  it("muestra '—' para WhatsApp/email/número de consulta cuando faltan", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("resuelve las URLs firmadas de los 6 campos de documento (piUrl, comprobantes, etc.) y de la carpeta genérica", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CONFIG_BASE, piUrl: "pedidos/p1/pi.pdf", seguroUrl: "pedidos/p1/seguro.pdf" });
    mockFindManyDocs.mockResolvedValueOnce([
      { id: "d1", tipo: "otro", nombre: "extra.pdf", notas: null, subidoPor: "a@x.com", createdAt: new Date(), url: "pedidos/p1/extra.pdf" },
    ]);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(mockGetSignedUrl).toHaveBeenCalledWith("documentos-pedidos", "pedidos/p1/pi.pdf");
    expect(mockGetSignedUrl).toHaveBeenCalledWith("documentos-pedidos", "pedidos/p1/seguro.pdf");
    expect(mockGetSignedUrl).toHaveBeenCalledWith("documentos-pedidos", "pedidos/p1/extra.pdf");
    expect(screen.getByText("Documentos: 1")).toBeInTheDocument();
  });

  it("campos de documento en null no llaman a getSignedUrl para ellos", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE); // todos los *Url son null
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    // Solo se llama por los documentos de la carpeta (acá 0) — ninguna llamada esperada.
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("NarrativeView renderiza líneas y bloques según buildPedidoNarrativeEs", async () => {
    // finalidad/provincia/habitaciones cargados generan más líneas narrativas reales.
    mockFindUnique.mockResolvedValueOnce({
      ...CONFIG_BASE,
      modelo: "20ft",
      finalidad: "vivienda",
      provincia: "Córdoba",
      habitaciones: 2,
    });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByText("Configuración completa")).toBeInTheDocument();
  });

  it("MaterialesConImagenes no rompe y no muestra nada cuando materiales es null", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByText("Materiales elegidos")).toBeInTheDocument();
  });

  it("MaterialesConImagenes muestra una card cuando un material seleccionado existe en el catálogo", async () => {
    const { MATERIAL_CATEGORY_GROUPS } = await import("@/data/material-catalog");
    const primerSelector = MATERIAL_CATEGORY_GROUPS[0].selectors[0];
    const primeraOpcion = primerSelector.options[0];
    mockFindUnique.mockResolvedValueOnce({
      ...CONFIG_BASE,
      materiales: { [primerSelector.key]: primeraOpcion.id },
    });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByText(primeraOpcion.label)).toBeInTheDocument();
  });

  it("pasa los vendedores activos a GestionPedidoPanel (query filtra rol vendedor + activo)", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(mockFindManyUsers).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rol: "vendedor", activo: true } })
    );
  });
});
