import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  mockGetAdminUser,
  mockUpdateManyCuota,
  mockCountCuota,
  mockFindManyAcuerdo,
  mockFindManyUnidad,
  mockFindManyCliente,
  mockFindManyTipoCambio,
  mockFindManyCierre,
  mockFindUniqueCierre,
  mockAggregateMovimiento,
} = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockUpdateManyCuota: vi.fn(),
  mockCountCuota: vi.fn(),
  mockFindManyAcuerdo: vi.fn(),
  mockFindManyUnidad: vi.fn(),
  mockFindManyCliente: vi.fn(),
  mockFindManyTipoCambio: vi.fn(),
  mockFindManyCierre: vi.fn(),
  mockFindUniqueCierre: vi.fn(),
  mockAggregateMovimiento: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cuota: { updateMany: mockUpdateManyCuota, count: mockCountCuota },
    acuerdoPago: { findMany: mockFindManyAcuerdo },
    unidad: { findMany: mockFindManyUnidad },
    cliente: { findMany: mockFindManyCliente },
    tipoCambio: { findMany: mockFindManyTipoCambio },
    cierrePeriodo: { findMany: mockFindManyCierre, findUnique: mockFindUniqueCierre },
    movimiento: { aggregate: mockAggregateMovimiento },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/components/admin/CobranzaPanel", () => ({
  default: ({
    acuerdosCobro,
    acuerdosPago,
    unidades,
    clientes,
    tiposCambio,
    cierres,
    rol,
    periodo,
    mesUnico,
    cierreActual,
    metricas,
    tabInicial,
    subInicial,
    estadoInicial,
    monedaInicial,
    clienteIdInicial,
  }: {
    acuerdosCobro: unknown[];
    acuerdosPago: unknown[];
    unidades: unknown[];
    clientes: unknown[];
    tiposCambio: unknown[];
    cierres: unknown[];
    rol: string;
    periodo: { tipo: string; desde: string; hasta: string };
    mesUnico: { mes: number; anio: number } | null;
    cierreActual: unknown;
    metricas: {
      usd: { cobrado: number; pagado: number; margen: number };
      ars: { cobrado: number; pagado: number; margen: number };
      cuotasVencidas: number;
      cuotasVencenSemana: number;
      periodosSinCerrar: number;
    };
    tabInicial?: string;
    subInicial?: string;
    estadoInicial?: string;
    monedaInicial?: string;
    clienteIdInicial?: string;
  }) => (
    <div>
      CobranzaPanel cobro={acuerdosCobro.length} pago={acuerdosPago.length} unidades={unidades.length} clientes=
      {clientes.length} tiposCambio={tiposCambio.length} cierres={cierres.length} rol={rol} periodoTipo=
      {periodo.tipo} mesUnico={mesUnico ? `${mesUnico.mes}/${mesUnico.anio}` : "none"} cierreActual=
      {cierreActual ? "si" : "no"} usdCobrado={metricas.usd.cobrado} usdPagado={metricas.usd.pagado} usdMargen=
      {metricas.usd.margen} arsCobrado={metricas.ars.cobrado} arsPagado={metricas.ars.pagado} arsMargen=
      {metricas.ars.margen} vencidas={metricas.cuotasVencidas} vencenSemana={metricas.cuotasVencenSemana}
      sinCerrar={metricas.periodosSinCerrar} tab={tabInicial ?? "none"} sub={subInicial ?? "none"} estado=
      {estadoInicial ?? "none"} moneda={monedaInicial ?? "none"} clienteId={clienteIdInicial ?? "none"}
    </div>
  ),
}));

import AdminCobranzaPage from "../page";

const ACUERDO = {
  id: "a1",
  unidadId: "u1",
  unidad: { numeroUnidad: "MOV-1", modelo: "Flex 18", estadoFabricacion: "pendiente", cliente: { id: "c1", nombre: "Juan" } },
  tipo: "cobro",
  concepto: "venta",
  descripcion: null,
  contraparte: "Juan",
  moneda: "USD",
  totalAcordado: 50000,
  notas: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  cuotas: [],
  movimientos: [],
};

function setupDefaults() {
  mockGetAdminUser.mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
  mockUpdateManyCuota.mockResolvedValue({ count: 0 });
  mockCountCuota.mockResolvedValue(0);
  mockFindManyAcuerdo.mockResolvedValue([]);
  mockFindManyUnidad.mockResolvedValue([]);
  mockFindManyCliente.mockResolvedValue([]);
  mockFindManyTipoCambio.mockResolvedValue([]);
  mockFindManyCierre.mockResolvedValue([]);
  mockFindUniqueCierre.mockResolvedValue(null);
  mockAggregateMovimiento.mockReset();
  mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: null } }); // cobradoUSD
  mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: null } }); // cobradoARS
  mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: null } }); // pagadoUSD
  mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: null } }); // pagadoARS
  mockAggregateMovimiento.mockResolvedValueOnce({ _min: { fecha: null } }); // primer movimiento
}

describe("AdminCobranzaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  it("corre el barrido de auto-vencimiento antes de consultar los acuerdos", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(mockUpdateManyCuota).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: "pendiente", vencimiento: expect.objectContaining({ lt: expect.any(Date) }) }),
        data: { estado: "vencido" },
      })
    );
  });

  it("separa los acuerdos por tipo (cobro/pago) en dos queries distintas", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([ACUERDO]).mockResolvedValueOnce([]);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(mockFindManyAcuerdo).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { tipo: "cobro" } }));
    expect(mockFindManyAcuerdo).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { tipo: "pago" } }));
    expect(screen.getByText(/cobro=1 pago=0/)).toBeInTheDocument();
  });

  it("serializa fechas de cuotas/movimientos sin romper", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        ...ACUERDO,
        cuotas: [{ id: "c1", descripcion: "Pago único", importe: 50000, vencimiento: new Date("2026-02-01"), estado: "pendiente" }],
        movimientos: [
          { id: "m1", fecha: new Date("2026-01-15"), importe: 20000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
        ],
      },
    ]);
    expect(async () => render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }))).not.toThrow();
  });

  it("por default usa el período 'mes_actual'", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/periodoTipo=mes_actual/)).toBeInTheDocument();
  });

  it("un periodo=trimestre válido se propaga", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ periodo: "trimestre" }) }));
    expect(screen.getByText(/periodoTipo=trimestre/)).toBeInTheDocument();
  });

  it("un periodo inválido cae a 'mes_actual'", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ periodo: "no-existe" }) }));
    expect(screen.getByText(/periodoTipo=mes_actual/)).toBeInTheDocument();
  });

  it("mes_actual resuelve a un mesUnico y consulta cierrePeriodo.findUnique con ese mes/año", async () => {
    const now = new Date();
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ periodo: "mes_actual" }) }));
    expect(screen.getByText(new RegExp(`mesUnico=${now.getMonth() + 1}/${now.getFullYear()}`))).toBeInTheDocument();
    expect(mockFindUniqueCierre).toHaveBeenCalledWith({
      where: { mes_anio: { mes: now.getMonth() + 1, anio: now.getFullYear() } },
    });
  });

  it("un trimestre no resuelve a un mesUnico (no consulta cierrePeriodo.findUnique)", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ periodo: "trimestre" }) }));
    expect(screen.getByText(/mesUnico=none/)).toBeInTheDocument();
    expect(mockFindUniqueCierre).not.toHaveBeenCalled();
  });

  it("pasa cierreActual=true cuando ya existe un cierre para el mesUnico resuelto", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce({
      id: "c1",
      mes: 1,
      anio: 2026,
      cerradoPor: "a@x.com",
      notas: null,
      totalCobradoUSD: 0,
      totalCobradoARS: 0,
      totalPagadoUSD: 0,
      totalPagadoARS: 0,
      margenUSD: 0,
      createdAt: new Date(),
    });
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ periodo: "mes_actual" }) }));
    expect(screen.getByText(/cierreActual=si/)).toBeInTheDocument();
  });

  it("las métricas USD/ARS de cobrado y pagado filtran movimientos por tipo, moneda y el rango del período", async () => {
    mockAggregateMovimiento.mockReset();
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 1000 } }); // cobradoUSD
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 2000 } }); // cobradoARS
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 300 } }); // pagadoUSD
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 400 } }); // pagadoARS
    mockAggregateMovimiento.mockResolvedValueOnce({ _min: { fecha: null } });
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/usdCobrado=1000/)).toBeInTheDocument();
    expect(screen.getByText(/usdPagado=300/)).toBeInTheDocument();
    expect(screen.getByText(/usdMargen=700/)).toBeInTheDocument();
    expect(screen.getByText(/arsCobrado=2000/)).toBeInTheDocument();
    expect(screen.getByText(/arsPagado=400/)).toBeInTheDocument();
    expect(screen.getByText(/arsMargen=1600/)).toBeInTheDocument();

    const callCobradoUSD = mockAggregateMovimiento.mock.calls[0][0];
    expect(callCobradoUSD.where.acuerdo).toEqual({ tipo: "cobro", moneda: "USD" });
    expect(callCobradoUSD.where.fecha.gte).toBeInstanceOf(Date);
    expect(callCobradoUSD.where.fecha.lt).toBeInstanceOf(Date);
  });

  it("pasa el conteo de cuotas vencidas y de las que vencen esta semana", async () => {
    mockCountCuota.mockReset();
    mockCountCuota.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/vencidas=3/)).toBeInTheDocument();
    expect(screen.getByText(/vencenSemana=2/)).toBeInTheDocument();
  });

  it("cuotasVencenSemana consulta estado pendiente con vencimiento en la semana en curso", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    const call = mockCountCuota.mock.calls[1][0];
    expect(call.where.estado).toBe("pendiente");
    expect(call.where.vencimiento.gte).toBeInstanceOf(Date);
    expect(call.where.vencimiento.lt).toBeInstanceOf(Date);
  });

  it("sin ningún movimiento todavía, periodosSinCerrar es 0", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/sinCerrar=0/)).toBeInTheDocument();
  });

  it("pasa unidades, clientes, tiposCambio y cierres serializados", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([{ id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" } }]);
    mockFindManyCliente.mockResolvedValueOnce([{ id: "c1", nombre: "Juan" }]);
    mockFindManyTipoCambio.mockResolvedValueOnce([
      { id: "t1", fecha: new Date("2026-01-01"), usdArs: 1000, fuente: "oficial", cargadoPor: "a@x.com" },
    ]);
    mockFindManyCierre.mockResolvedValueOnce([
      { id: "c1", mes: 1, anio: 2026, cerradoPor: "a@x.com", notas: null, totalCobradoUSD: 0, totalCobradoARS: 0, totalPagadoUSD: 0, totalPagadoARS: 0, margenUSD: 0, createdAt: new Date() },
    ]);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/unidades=1/)).toBeInTheDocument();
    expect(screen.getByText(/clientes=1/)).toBeInTheDocument();
    expect(screen.getByText(/tiposCambio=1/)).toBeInTheDocument();
    expect(screen.getByText(/cierres=1/)).toBeInTheDocument();
  });

  it("rol cae a 'vendedor' sin sesión, sin romper la página", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/rol=vendedor/)).toBeInTheDocument();
  });

  it("tab/sub/estado/moneda/clienteId del querystring se propagan como valores iniciales", async () => {
    render(
      await AdminCobranzaPage({
        searchParams: Promise.resolve({ tab: "cierres", sub: "pagos", estado: "vencido", moneda: "ARS", clienteId: "c1" }),
      })
    );
    expect(screen.getByText(/tab=cierres/)).toBeInTheDocument();
    expect(screen.getByText(/sub=pagos/)).toBeInTheDocument();
    expect(screen.getByText(/estado=vencido/)).toBeInTheDocument();
    expect(screen.getByText(/moneda=ARS/)).toBeInTheDocument();
    expect(screen.getByText(/clienteId=c1/)).toBeInTheDocument();
  });

  it("un tab fuera del catálogo cae a undefined ('none' en el mock)", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ tab: "no-existe" }) }));
    expect(screen.getByText(/tab=none/)).toBeInTheDocument();
  });

  it("una moneda fuera de USD/ARS cae a undefined ('none' en el mock)", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ moneda: "no-existe" }) }));
    expect(screen.getByText(/moneda=none/)).toBeInTheDocument();
  });

  it("muestra el título Cobranza", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Cobranza")).toBeInTheDocument();
  });
});
