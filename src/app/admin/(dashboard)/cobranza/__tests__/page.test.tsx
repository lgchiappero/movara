import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  mockUpdateManyCuota,
  mockCountCuota,
  mockFindManyAcuerdo,
  mockFindManyUnidad,
  mockAggregateMovimiento,
} = vi.hoisted(() => ({
  mockUpdateManyCuota: vi.fn(),
  mockCountCuota: vi.fn(),
  mockFindManyAcuerdo: vi.fn(),
  mockFindManyUnidad: vi.fn(),
  mockAggregateMovimiento: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cuota: { updateMany: mockUpdateManyCuota, count: mockCountCuota },
    acuerdoPago: { findMany: mockFindManyAcuerdo },
    unidad: { findMany: mockFindManyUnidad },
    movimiento: { aggregate: mockAggregateMovimiento },
  },
}));
vi.mock("@/components/admin/CobranzaPanel", () => ({
  default: ({
    acuerdosCobro,
    acuerdosPago,
    unidades,
    metricas,
    tabInicial,
    estadoInicial,
  }: {
    acuerdosCobro: unknown[];
    acuerdosPago: unknown[];
    unidades: unknown[];
    metricas: { cobradoMes: number; pagadoMes: number; margenMes: number; cuotasVencidas: number };
    tabInicial?: string;
    estadoInicial?: string;
  }) => (
    <div>
      CobranzaPanel cobro={acuerdosCobro.length} pago={acuerdosPago.length} unidades={unidades.length} cobradoMes=
      {metricas.cobradoMes} pagadoMes={metricas.pagadoMes} margenMes={metricas.margenMes} vencidas=
      {metricas.cuotasVencidas} tab={tabInicial ?? "none"} estado={estadoInicial ?? "none"}
    </div>
  ),
}));

import AdminCobranzaPage from "../page";

const ACUERDO = {
  id: "a1",
  unidadId: "u1",
  unidad: { numeroUnidad: "MOV-1", cliente: { nombre: "Juan" } },
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

describe("AdminCobranzaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateManyCuota.mockResolvedValue({ count: 0 });
    mockCountCuota.mockResolvedValue(0);
    mockFindManyAcuerdo.mockResolvedValue([]);
    mockFindManyUnidad.mockResolvedValue([]);
    mockAggregateMovimiento.mockResolvedValue({ _sum: { importe: null } });
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
    expect(screen.getByText(/CobranzaPanel cobro=1 pago=0/)).toBeInTheDocument();
  });

  it("serializa fechas de cuotas/movimientos a ISO string sin romper", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        ...ACUERDO,
        cuotas: [{ id: "c1", descripcion: "Pago único", importe: 50000, vencimiento: new Date("2026-02-01"), estado: "pendiente" }],
        movimientos: [
          {
            id: "m1",
            fecha: new Date("2026-01-15"),
            importe: 20000,
            modalidad: "transferencia",
            cuotaId: null,
            comprobanteUrl: null,
            notas: null,
            registradoPor: "a@x.com",
          },
        ],
      },
    ]);
    expect(async () => render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }))).not.toThrow();
  });

  it("las métricas de cobrado/pagado del mes filtran movimientos por tipo de acuerdo y moneda USD", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(mockAggregateMovimiento).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ acuerdo: { tipo: "cobro", moneda: "USD" } }) })
    );
    expect(mockAggregateMovimiento).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expect.objectContaining({ acuerdo: { tipo: "pago", moneda: "USD" } }) })
    );
  });

  it("el margen del mes es cobrado - pagado, y ambos caen a 0 cuando el agregado es null", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/cobradoMes=0/)).toBeInTheDocument();
    expect(screen.getByText(/pagadoMes=0/)).toBeInTheDocument();
    expect(screen.getByText(/margenMes=0/)).toBeInTheDocument();
  });

  it("calcula el margen del mes con montos reales", async () => {
    mockAggregateMovimiento.mockReset();
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 10000 } });
    mockAggregateMovimiento.mockResolvedValueOnce({ _sum: { importe: 4000 } });
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/margenMes=6000/)).toBeInTheDocument();
  });

  it("pasa el conteo de cuotas vencidas como métrica", async () => {
    mockCountCuota.mockResolvedValueOnce(7);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/vencidas=7/)).toBeInTheDocument();
  });

  it("pasa las unidades serializadas para el selector del modal de creación", async () => {
    mockFindManyUnidad.mockResolvedValueOnce([
      { id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" } },
      { id: "u2", numeroUnidad: null, cliente: { nombre: "Ana" } },
    ]);
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/unidades=2/)).toBeInTheDocument();
  });

  it("tipo=pago en el querystring pasa tabInicial='pagos'", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ tipo: "pago" }) }));
    expect(screen.getByText(/tab=pagos/)).toBeInTheDocument();
  });

  it("tipo=cobro en el querystring pasa tabInicial='cobros'", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ tipo: "cobro" }) }));
    expect(screen.getByText(/tab=cobros/)).toBeInTheDocument();
  });

  it("sin tipo en el querystring, tabInicial es undefined ('none' en el mock)", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/tab=none/)).toBeInTheDocument();
  });

  it("estado=vencido en el querystring pasa estadoInicial='vencido'", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ estado: "vencido" }) }));
    expect(screen.getByText(/estado=vencido/)).toBeInTheDocument();
  });

  it("un valor de estado distinto de 'vencido' se ignora", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({ estado: "cualquier-cosa" }) }));
    expect(screen.getByText(/estado=none/)).toBeInTheDocument();
  });

  it("muestra el título Cobranza", async () => {
    render(await AdminCobranzaPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Cobranza")).toBeInTheDocument();
  });
});
