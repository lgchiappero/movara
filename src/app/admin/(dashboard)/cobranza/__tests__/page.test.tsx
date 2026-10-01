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
  mockGetSignedUrl,
  mockRedirect,
  mockFindManyProrrateo,
} = vi.hoisted(() => ({
  mockFindManyProrrateo: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
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
  mockGetSignedUrl: vi.fn(),
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
    prorrateoLogistica: { findMany: mockFindManyProrrateo },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("@/lib/admin/storage", () => ({ getSignedUrl: mockGetSignedUrl, BUCKET_MOVARA: "documentos-movara" }));
vi.mock("@/components/admin/CobranzaPanel", () => ({
  default: ({
    filas,
    prorrateosLogistica,
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
    estadoInicial,
    monedaInicial,
    clienteIdInicial,
  }: {
    filas: { key: string; estado: string; saldo: number }[];
    prorrateosLogistica: { unidadId: string; importe: number; fecha: string; unidadNumero: string | null }[];
    acuerdosCobro: { movimientos: { comprobanteSignedUrl: string | null }[] }[];
    acuerdosPago: unknown[];
    unidades: { id: string; tienePlanCobro?: boolean }[];
    clientes: unknown[];
    tiposCambio: unknown[];
    cierres: unknown[];
    rol: string;
    periodo: { tipo: string; desde: string; hasta: string };
    mesUnico: { mes: number; anio: number } | null;
    cierreActual: unknown;
    metricas: {
      cobrado: { USD: number; ARS: number };
      pendiente: { USD: number; ARS: number };
      unidadesSaldadasMes: number;
      unidadesConVencidas: number;
      periodosSinCerrar: number;
    };
    tabInicial?: string;
    estadoInicial?: string;
    monedaInicial?: string;
    clienteIdInicial?: string;
  }) => (
    <div>
      CobranzaPanel filas={filas.map((f) => `${f.key}:${f.estado}:${f.saldo}`).join(",")} prorrateos=
      {prorrateosLogistica.map((p) => `${p.unidadNumero}:${p.importe}:${p.fecha.slice(0, 10)}`).join(",") || "none"} conPlan=
      {unidades.filter((u) => u.tienePlanCobro).map((u) => u.id).join(",")} cobro={acuerdosCobro.length} pago=
      {acuerdosPago.length} unidades={unidades.length} clientes={clientes.length} tiposCambio={tiposCambio.length} cierres=
      {cierres.length} rol={rol} periodoTipo={periodo.tipo} mesUnico={mesUnico ? `${mesUnico.mes}/${mesUnico.anio}` : "none"}{" "}
      cierreActual={cierreActual ? "si" : "no"} cobradoUSD={metricas.cobrado.USD} cobradoARS={metricas.cobrado.ARS}{" "}
      pendienteUSD={metricas.pendiente.USD} pendienteARS={metricas.pendiente.ARS} saldadasMes={metricas.unidadesSaldadasMes}{" "}
      conVencidas={metricas.unidadesConVencidas} sinCerrar={metricas.periodosSinCerrar} tab={tabInicial ?? "none"} estado=
      {estadoInicial ?? "none"} moneda={monedaInicial ?? "none"} clienteId={clienteIdInicial ?? "none"}{" "}
      comprobante={acuerdosCobro[0]?.movimientos[0]?.comprobanteSignedUrl ?? "none"}
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
  mockFindManyProrrateo.mockResolvedValue([]);
  mockAggregateMovimiento.mockReset();
  mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: null } }); // cobradoUSD
  mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: null } }); // cobradoARS
  mockAggregateMovimiento.mockResolvedValueOnce({ _min: { fecha: null } }); // primer movimiento
  mockGetSignedUrl.mockReset();
  mockGetSignedUrl.mockResolvedValue("https://signed.example/comprobante.pdf");
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

  it("resuelve la URL firmada del comprobante cuando el movimiento tiene uno", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        ...ACUERDO,
        movimientos: [
          { id: "m1", fecha: new Date("2026-01-15"), importe: 20000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: "cobranza/a1/comprobante.pdf", notas: null, registradoPor: "a@x.com" },
        ],
      },
    ]);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(mockGetSignedUrl).toHaveBeenCalledWith("documentos-movara", "cobranza/a1/comprobante.pdf");
    expect(screen.getByText(/comprobante=https:\/\/signed\.example\/comprobante\.pdf/)).toBeInTheDocument();
  });

  it("no consulta una URL firmada cuando el movimiento no tiene comprobante", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        ...ACUERDO,
        movimientos: [
          { id: "m1", fecha: new Date("2026-01-15"), importe: 20000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
        ],
      },
    ]);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
    expect(screen.getByText(/comprobante=none/)).toBeInTheDocument();
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

  it("'Cobrado en el período' por moneda: movimientos de cobro dentro del rango", async () => {
    mockAggregateMovimiento.mockReset();
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 1000 } }); // cobradoUSD
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 2000 } }); // cobradoARS
    mockAggregateMovimiento.mockResolvedValueOnce({ _min: { fecha: null } });
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/cobradoUSD=1000 cobradoARS=2000/)).toBeInTheDocument();

    const callCobradoUSD = mockAggregateMovimiento.mock.calls[0][0];
    expect(callCobradoUSD.where.acuerdo).toEqual({ tipo: "cobro", moneda: "USD" });
    expect(callCobradoUSD.where.fecha.gte).toBeInstanceOf(Date);
    expect(callCobradoUSD.where.fecha.lt).toBeInstanceOf(Date);
    expect(mockAggregateMovimiento.mock.calls[1][0].where.acuerdo).toEqual({ tipo: "cobro", moneda: "ARS" });
  });

  it("arma una fila por unidad (con o sin plan) y las métricas de pendiente / saldadas / vencidas", async () => {
    const hoy = new Date();
    mockFindManyUnidad.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", modelo: "Flex 18", precioCliente: 50000, cliente: { nombre: "Juan" } },
      { id: "u2", numeroUnidad: "MOV-2", modelo: null, precioCliente: null, cliente: { nombre: "Ana" } },
      { id: "u3", numeroUnidad: "MOV-3", modelo: "Flex 38", precioCliente: 1000, cliente: { nombre: "Eva" } },
    ]);
    mockFindManyAcuerdo
      .mockResolvedValueOnce([
        {
          ...ACUERDO,
          cuotas: [{ id: "c1", descripcion: "Anticipo", importe: 50000, vencimiento: new Date("2020-01-01"), estado: "vencido" }],
          movimientos: [
            { id: "m1", fecha: new Date("2026-01-15"), importe: 20000, modalidad: "transferencia", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
          ],
        },
        {
          ...ACUERDO,
          id: "a3",
          unidadId: "u3",
          unidad: { ...ACUERDO.unidad, numeroUnidad: "MOV-3" },
          totalAcordado: 1000,
          movimientos: [
            { id: "m3", fecha: hoy, importe: 1000, modalidad: "efectivo", cuotaId: null, comprobanteUrl: null, notas: null, registradoPor: "a@x.com" },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/filas=u1\|USD:en_curso:30000,u2\|USD:sin_plan:0,u3\|USD:saldado:0/)).toBeInTheDocument();
    expect(screen.getByText(/pendienteUSD=30000 pendienteARS=0 saldadasMes=1/)).toBeInTheDocument();
    expect(screen.getByText(/conVencidas=1/)).toBeInTheDocument();
    // Las unidades que ya tienen plan quedan marcadas (un solo plan por unidad).
    expect(screen.getByText(/conPlan=u1,u3/)).toBeInTheDocument();
  });

  it("sin ningún movimiento todavía, periodosSinCerrar es 0", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/sinCerrar=0/)).toBeInTheDocument();
  });

  it("pasa unidades, clientes, tiposCambio y cierres serializados", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", modelo: null, precioCliente: null, cliente: { nombre: "Juan" } },
    ]);
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
        searchParams: Promise.resolve({ tab: "cierres", estado: "vencido", moneda: "ARS", clienteId: "c1" }),
      })
    );
    expect(screen.getByText(/tab=cierres/)).toBeInTheDocument();
    expect(screen.getByText(/estado=vencidas/)).toBeInTheDocument();
    expect(screen.getByText(/moneda=ARS/)).toBeInTheDocument();
    expect(screen.getByText(/clienteId=c1/)).toBeInTheDocument();
  });

  it("los pagos a proveedores viven en /admin/pagos: tipo=pago redirige ahí conservando estado/vence/moneda", async () => {
    await expect(
      AdminCobranzaPage({ searchParams: Promise.resolve({ tipo: "pago", estado: "pendiente", vence: "semana", moneda: "USD" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/admin/pagos?estado=pendiente&vence=semana&moneda=USD");
  });

  it("sub=pagos también redirige a /admin/pagos (sin filtros → sin querystring)", async () => {
    await expect(AdminCobranzaPage({ searchParams: Promise.resolve({ sub: "pagos" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/admin/pagos"
    );
  });

  it("tipo=pago con sub=cobros explícito no redirige", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ tipo: "pago", sub: "cobros" }) }));
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("tipo=cobro (alias del dashboard) se queda en Cobranza", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ tipo: "cobro" }) }));
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText("Cobranza")).toBeInTheDocument();
  });

  it("alias estado=pagado (usado por los KPIs del dashboard) resuelve al EstadoAcuerdo real 'saldado'", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ estado: "pagado" }) }));
    expect(screen.getByText(/estado=saldado/)).toBeInTheDocument();
  });

  it("vence=semana resuelve estado a 'semana' sin importar qué venga en estado", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ estado: "pendiente", vence: "semana" }) }));
    expect(screen.getByText(/estado=semana/)).toBeInTheDocument();
  });

  it("periodo=mes (alias del dashboard) cae al default 'mes_actual' igual que cualquier valor inválido", async () => {
    mockFindUniqueCierre.mockResolvedValueOnce(null);
    await AdminCobranzaPage({ searchParams: Promise.resolve({ periodo: "mes" }) });
    const call = mockFindUniqueCierre.mock.calls[0][0];
    const now = new Date();
    expect(call.where.mes_anio).toEqual({ mes: now.getMonth() + 1, anio: now.getFullYear() });
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

  it("Rentabilidad: pasa la parte de logística internacional prorrateada (pagada, USD) de cada unidad", async () => {
    mockFindManyProrrateo.mockResolvedValueOnce([
      {
        unidadId: "u1",
        importe: 1250,
        costo: { fecha: new Date("2026-09-15T00:00:00.000Z") },
        unidad: { numeroUnidad: "MOV-1", modelo: "Flex 38", estadoFabricacion: "en_transito", cliente: { nombre: "Ana" } },
      },
    ]);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(mockFindManyProrrateo).toHaveBeenCalledWith(
      expect.objectContaining({ where: { costo: { estado: "pagado", moneda: "USD" } } })
    );
    expect(screen.getByText(/prorrateos=MOV-1:1250:2026-09-15/)).toBeInTheDocument();
  });
});
