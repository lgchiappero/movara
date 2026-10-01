import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  mockGetAdminUser,
  mockUpdateManyCuota,
  mockFindManyAcuerdo,
  mockFindManyCosto,
  mockFindManyUnidad,
  mockFindManyEnvio,
  mockGetSignedUrl,
} = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockUpdateManyCuota: vi.fn(),
  mockFindManyAcuerdo: vi.fn(),
  mockFindManyCosto: vi.fn(),
  mockFindManyUnidad: vi.fn(),
  mockFindManyEnvio: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cuota: { updateMany: mockUpdateManyCuota },
    acuerdoPago: { findMany: mockFindManyAcuerdo },
    costoLogistica: { findMany: mockFindManyCosto },
    unidad: { findMany: mockFindManyUnidad },
    envio: { findMany: mockFindManyEnvio },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/admin/storage", () => ({ getSignedUrl: mockGetSignedUrl, BUCKET_MOVARA: "documentos-movara" }));
vi.mock("@/components/admin/PagosPanel", () => ({
  default: (p: {
    planes: { id: string }[];
    costos: { id: string; comprobanteSignedUrl: string | null }[];
    unidades: unknown[];
    envios: { id: string; cantidadUnidades: number }[];
    rol: string;
    metricas: { pagadoMes: { USD: number; ARS: number }; pendiente: { USD: number; ARS: number }; vencidos: number };
    tabInicial?: string;
    estadoInicial?: string;
  }) => (
    <div>
      PagosPanel planes={p.planes.map((x) => x.id).join(",")} costos=
      {p.costos.map((c) => `${c.id}:${c.comprobanteSignedUrl ?? "sin"}`).join(",")} unidades={p.unidades.length} envios=
      {p.envios.map((e) => `${e.id}:${e.cantidadUnidades}`).join(",")} rol={p.rol} pagadoUSD={p.metricas.pagadoMes.USD}{" "}
      pagadoARS={p.metricas.pagadoMes.ARS} pendienteUSD={p.metricas.pendiente.USD} pendienteARS={p.metricas.pendiente.ARS}{" "}
      vencidos={p.metricas.vencidos} tab={p.tabInicial ?? "none"} estado={p.estadoInicial ?? "none"}
    </div>
  ),
}));

import AdminPagosPage from "../page";

const ahora = new Date();
const esteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 12);

function plan(over: Record<string, unknown>) {
  return {
    id: "p1",
    unidadId: "u1",
    unidad: { numeroUnidad: "MOV-1", modelo: "Flex 38", estadoFabricacion: "pendiente", cliente: { id: "c1", nombre: "Juan" } },
    tipo: "pago",
    concepto: "fabrica",
    descripcion: null,
    contraparte: "Heshi",
    moneda: "USD",
    totalAcordado: 30000,
    notas: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    cuotas: [],
    movimientos: [],
    ...over,
  };
}

function costo(over: Record<string, unknown>) {
  return {
    id: "c1",
    envioId: "e1",
    envio: { numeroPI: "PI-1", numeroContenedor: "MSCU1" },
    concepto: "flete",
    descripcion: null,
    moneda: "USD",
    importe: 4000,
    fecha: esteMes,
    estado: "pagado",
    comprobanteUrl: null,
    notas: null,
    prorrateado: false,
    createdAt: esteMes,
    prorrateos: [],
    ...over,
  };
}

describe("AdminPagosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue({ rol: "admin" });
    mockUpdateManyCuota.mockResolvedValue({ count: 0 });
    mockFindManyAcuerdo.mockResolvedValue([
      // Fábrica: 30000, pagó 15000 este mes; cuota vencida → vencido.
      plan({
        cuotas: [{ id: "q1", descripcion: "Saldo 50%", importe: 15000, vencimiento: new Date("2020-01-01"), estado: "vencido" }],
        movimientos: [
          { id: "m1", fecha: esteMes, importe: 15000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a" },
        ],
      }),
      // Grúa en ARS, pendiente.
      plan({ id: "p2", concepto: "grua", contraparte: "Grúas Sur", moneda: "ARS", totalAcordado: 200000 }),
    ]);
    mockFindManyCosto.mockResolvedValue([
      costo({ comprobanteUrl: "logistica/e1/flete.pdf" }),
      // Pendiente y ya vencido.
      costo({ id: "c2", concepto: "vep", moneda: "ARS", importe: 50000, estado: "pendiente", fecha: new Date("2020-01-01") }),
    ]);
    mockFindManyUnidad.mockResolvedValue([{ id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" } }]);
    mockFindManyEnvio.mockResolvedValue([{ id: "e1", numeroPI: "PI-1", numeroContenedor: "MSCU1", _count: { unidades: 3 } }]);
    mockGetSignedUrl.mockResolvedValue("https://signed/flete.pdf");
  });

  it("muestra el título y pasa planes por unidad, costos de logística (con comprobante firmado), unidades y envíos", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Pagos" })).toBeInTheDocument();
    expect(mockFindManyAcuerdo).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: "pago" } }));
    expect(screen.getByText(/planes=p1,p2 costos=c1:https:\/\/signed\/flete.pdf,c2:sin unidades=1 envios=e1:3 rol=admin/)).toBeInTheDocument();
  });

  it("métricas: pagado este mes y pendiente suman pagos por unidad + logística; vencidos cuenta ambos", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({}) }));
    // Pagado este mes: 15000 (fábrica) + 4000 (flete). Pendiente: 15000 fábrica + 200000 grúa ARS + 50000 VEP ARS.
    expect(screen.getByText(/pagadoUSD=19000 pagadoARS=0 pendienteUSD=15000 pendienteARS=250000/)).toBeInTheDocument();
    expect(screen.getByText(/vencidos=2/)).toBeInTheDocument();
  });

  it("corre el barrido de auto-vencimiento de cuotas", async () => {
    await AdminPagosPage({ searchParams: Promise.resolve({}) });
    expect(mockUpdateManyCuota).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ estado: "pendiente" }), data: { estado: "vencido" } })
    );
  });

  it("tab y estado desde la URL, con los alias del dashboard; sin sesión el rol es vendedor", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    render(await AdminPagosPage({ searchParams: Promise.resolve({ tab: "logistica", estado: "vencidas" }) }));
    expect(screen.getByText(/rol=vendedor/)).toBeInTheDocument();
    expect(screen.getByText(/tab=logistica estado=vencido/)).toBeInTheDocument();
  });

  it("estado=saldado → pagado; con_saldo se respeta; un estado o tab desconocido cae al default", async () => {
    const { unmount } = render(await AdminPagosPage({ searchParams: Promise.resolve({ estado: "saldado" }) }));
    expect(screen.getByText(/tab=unidad estado=pagado/)).toBeInTheDocument();
    unmount();
    const r2 = render(await AdminPagosPage({ searchParams: Promise.resolve({ estado: "con_saldo" }) }));
    expect(screen.getByText(/estado=con_saldo/)).toBeInTheDocument();
    r2.unmount();
    render(await AdminPagosPage({ searchParams: Promise.resolve({ tab: "otro", estado: "inventado" }) }));
    expect(screen.getByText(/tab=unidad estado=none/)).toBeInTheDocument();
  });

  it("ignora monedas fuera de USD/ARS en las métricas", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([plan({ moneda: "EUR" })]);
    mockFindManyCosto.mockResolvedValueOnce([]);
    render(await AdminPagosPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/pagadoUSD=0 pagadoARS=0 pendienteUSD=0 pendienteARS=0/)).toBeInTheDocument();
  });
});
