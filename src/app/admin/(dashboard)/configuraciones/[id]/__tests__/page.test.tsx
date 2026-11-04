import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindUnique, mockFindManyUsers, mockFindManyDocs, mockNotFound, mockGetSignedUrl, mockGetAdminUser } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindManyUsers: vi.fn().mockResolvedValue([]),
  mockFindManyDocs: vi.fn().mockResolvedValue([]),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/x"),
  mockGetAdminUser: vi.fn().mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    configuracionPedido: { findUnique: mockFindUnique },
    adminUser: { findMany: mockFindManyUsers },
    documentoPedido: { findMany: mockFindManyDocs },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
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
vi.mock("@/components/admin/CancelarPedidoSection", () => ({
  default: ({ cancelado }: { cancelado: boolean }) => <div>CancelarPedidoSection cancelado={String(cancelado)}</div>,
}));
vi.mock("@/components/admin/DocumentosPedidoSection", () => ({
  default: ({ documentos, puedeEliminar }: { documentos: unknown[]; puedeEliminar?: boolean }) => (
    <div>
      Documentos: {documentos.length}
      {puedeEliminar ? " (puede eliminar)" : ""}
    </div>
  ),
}));
vi.mock("@/components/admin/ConfiguracionEspacioForm", () => ({ default: () => <div>ConfiguracionEspacioForm</div> }));
vi.mock("@/components/admin/EliminarConfiguracionButton", () => ({
  default: () => <div>EliminarConfiguracionButton</div>,
}));

const { mockNarrative } = vi.hoisted(() => ({ mockNarrative: vi.fn() }));
vi.mock("@/lib/pdf/pedido-narrative-es", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/pdf/pedido-narrative-es")>();
  mockNarrative.mockImplementation(real.buildPedidoNarrativeEs);
  return { ...real, buildPedidoNarrativeEs: (d: Parameters<typeof real.buildPedidoNarrativeEs>[0]) => mockNarrative(d) };
});

import ConfiguracionDetailPage from "../page";

/** El error de producción del 3/11/2026 (digest 2875324328). */
function errorColumnaFaltante() {
  return Object.assign(
    new Error(
      "\nInvalid `prisma.configuracionPedido.findUnique()` invocation:\n\n\n" +
        "The column `configuraciones_pedido.desgloseEstimado` does not exist in the current database."
    ),
    { code: "P2022", meta: { modelName: "ConfiguracionPedido" } }
  );
}

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

  it("enlaza la ficha del cliente si el pedido tiene uno y muestra la sección de cancelación", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CONFIG_BASE, clienteId: "c1", estadoPedido: "cancelado", fechaCancelacion: new Date() });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByRole("link", { name: /ver ficha del cliente/i })).toHaveAttribute("href", "/admin/clientes/c1");
    expect(screen.getByText("CancelarPedidoSection cancelado=true")).toBeInTheDocument();
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
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
    expect(screen.getByText("Documentos: 1 (puede eliminar)")).toBeInTheDocument();
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

  it("MaterialesConImagenes muestra igual una mesada retirada del catálogo y el texto libre del admin", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...CONFIG_BASE,
      materiales: { mesada: "negro-absoluto", piso: "Porcelanato a definir" },
    });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getAllByText("Negro absoluto (opción discontinuada)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Porcelanato a definir").length).toBeGreaterThan(0);
  });

  it("MaterialesConImagenes marca el balcón con sobretecho completo como A consultar y muestra la galería de un pedido viejo", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...CONFIG_BASE,
      materiales: { balcon: "frontal", techoBalcon: "completo", galeria: "galeria-01" },
    });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByText("Balcón frontal")).toBeInTheDocument();
    expect(screen.getAllByText("A consultar", { selector: "p" })).toHaveLength(2);
    expect(screen.getAllByText("Galería con sobretecho (configuración anterior)").length).toBeGreaterThan(0);
  });

  it("MaterialesConImagenes: amoblamiento del baño elegido con su nombre; un pedido viejo sin el dato muestra —", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CONFIG_BASE, materiales: { amoblamientoBano: "amoblamiento-02" } });
    const { unmount } = render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    // La opción 2 trae base de ducha negra: figura junto a la opción.
    expect(screen.getAllByText("Amoblamiento — opción 2 — Base de ducha (negra)").length).toBeGreaterThan(0);
    unmount();

    mockFindUnique.mockResolvedValueOnce({ ...CONFIG_BASE, materiales: { panelesBano: "blanco-liso" } });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    // La card de materiales y el resumen del pedido.
    expect(screen.getAllByText("Amoblamiento del baño: —")).toHaveLength(2);
  });

  it("MaterialesConImagenes: la puerta y la cocina con costo se ven con el nombre del extra", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CONFIG_BASE, materiales: { puertaPrincipal: "doble-hoja-moderna", cocinaAmpliada: "ushape-02" } });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getAllByText("Puerta doble hoja moderna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cocina en U — opción 2").length).toBeGreaterThan(0);
  });

  it("MaterialesConImagenes: el balcón con sobretecho solo en el balcón tiene precio, no es A consultar", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...CONFIG_BASE,
      materiales: { balcon: "frontal", techoBalcon: "solo-balcon", banera: "banera-01" },
    });
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByText("Balcón frontal")).toBeInTheDocument();
    // Solo la bañera.
    expect(screen.getAllByText("A consultar", { selector: "p" })).toHaveLength(1);
  });

  it("pasa los vendedores activos a GestionPedidoPanel (query filtra rol vendedor + activo)", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(mockFindManyUsers).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rol: "vendedor", activo: true } })
    );
  });

  it("rol admin ve el botón de eliminar", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.getByText("EliminarConfiguracionButton")).toBeInTheDocument();
    expect(screen.getByText(/puede eliminar/)).toBeInTheDocument();
  });

  it("rol vendedor no ve el botón de eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u2", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
    render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
    expect(screen.queryByText("EliminarConfiguracionButton")).not.toBeInTheDocument();
    expect(screen.queryByText(/puede eliminar/)).not.toBeInTheDocument();
  });

  describe("nunca rompe entero", () => {
    it("reproduce producción: sin la columna desgloseEstimado el detalle abre igual, con aviso", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockFindUnique.mockRejectedValueOnce(errorColumnaFaltante()).mockResolvedValueOnce(CONFIG_BASE);
      render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
      expect(screen.getByRole("heading", { name: "Juan García" })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Hay datos de este pedido que no se pudieron leer (desgloseEstimado)");
      expect(screen.getByText("Configuración completa")).toBeInTheDocument();
      expect(screen.getByText("ConfiguracionEspacioForm")).toBeInTheDocument();
      expect(screen.getByText("GestionPedidoPanel")).toBeInTheDocument();
    });

    it("un pedido nuevo con inodoro, amoblamiento y desglose nulo abre sin aviso", async () => {
      mockFindUnique.mockResolvedValueOnce({
        ...CONFIG_BASE,
        desgloseEstimado: null,
        materiales: { inodoro: "inteligente-bidet", amoblamientoBano: "amoblamiento-02", balcon: "frontal", techoBalcon: "solo-balcon" },
      });
      render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getAllByText("Inodoro inteligente con bidet").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Amoblamiento — opción 2/).length).toBeGreaterThan(0);
    });

    it("materiales con forma rara y upgrades nulos no rompen", async () => {
      mockFindUnique.mockResolvedValueOnce({ ...CONFIG_BASE, materiales: "texto suelto", upgrades: null });
      render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
      expect(screen.getByText("Materiales elegidos")).toBeInTheDocument();
      expect(screen.queryByText("Dato no disponible.")).toBeNull();
    });

    it("si una sección falla al armarse muestra 'Dato no disponible' y el resto del pedido", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockNarrative.mockImplementationOnce(() => {
        throw new Error("campo raro");
      });
      mockFindUnique.mockResolvedValueOnce(CONFIG_BASE);
      render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
      expect(screen.getByText("Dato no disponible.")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Juan García" })).toBeInTheDocument();
      expect(screen.getByText("GestionPedidoPanel")).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Configuración completa"), expect.any(Error));
    });

    it("si fallan Storage o la lectura de documentos, el pedido se ve igual", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockFindUnique.mockResolvedValueOnce({ ...CONFIG_BASE, piUrl: "pi.pdf" });
      mockGetSignedUrl.mockRejectedValueOnce(new Error("storage caído"));
      mockFindManyDocs.mockRejectedValueOnce(new Error("db docs"));
      render(await ConfiguracionDetailPage({ params: Promise.resolve({ id: "p1" }) }));
      expect(screen.getByText(/Documentos: 0/)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Juan García" })).toBeInTheDocument();
    });
  });
});
