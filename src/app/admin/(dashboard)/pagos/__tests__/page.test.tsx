import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockGetAdminUser, mockUpdateManyCuota, mockFindManyAcuerdo, mockFindManyUnidad, mockAggregate, mockGetSignedUrl } =
  vi.hoisted(() => ({
    mockGetAdminUser: vi.fn(),
    mockUpdateManyCuota: vi.fn(),
    mockFindManyAcuerdo: vi.fn(),
    mockFindManyUnidad: vi.fn(),
    mockAggregate: vi.fn(),
    mockGetSignedUrl: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    cuota: { updateMany: mockUpdateManyCuota },
    acuerdoPago: { findMany: mockFindManyAcuerdo },
    unidad: { findMany: mockFindManyUnidad },
    movimiento: { aggregate: mockAggregate },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/admin/storage", () => ({ getSignedUrl: mockGetSignedUrl, BUCKET_MOVARA: "documentos-movara" }));
vi.mock("@/components/admin/PagosPanel", () => ({
  default: (p: {
    filas: { key: string; estado: string; saldo: number }[];
    unidades: unknown[];
    rol: string;
    metricas: { pagadoMes: { USD: number; ARS: number }; pendiente: { USD: number; ARS: number }; unidadesCompletasMes: number; unidadesConVencidas: number };
    estadoInicial?: string;
    monedaInicial?: string;
  }) => (
    <div>
      PagosPanel filas={p.filas.map((f) => `${f.key}:${f.estado}:${f.saldo}`).join(",")} unidades={p.unidades.length} rol={p.rol}{" "}
      pagadoUSD={p.metricas.pagadoMes.USD} pagadoARS={p.metricas.pagadoMes.ARS} pendienteUSD={p.metricas.pendiente.USD}{" "}
      completas={p.metricas.unidadesCompletasMes} vencidas={p.metricas.unidadesConVencidas} estado={p.estadoInicial ?? "none"}{" "}
      moneda={p.monedaInicial ?? "none"}
    </div>
  ),
}));

import AdminPagosPage from "../page";

const ACUERDO_PAGO = {
  id: "a1",
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
  cuotas: [{ id: "q1", descripcion: "Anticipo", importe: 30000, vencimiento: new Date("2020-01-01"), estado: "vencido" }],
  movimientos: [
    { id: "m1", fecha: new Date("2026-01-15"), importe: 9000, modalidad: "transferencia", cuotaId: "q1", comprobanteUrl: "pagos/x.pdf", notas: null, registradoPor: "a@x.com" },
  ],
};

describe("AdminPagosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue({ rol: "admin" });
    mockUpdateManyCuota.mockResolvedValue({ count: 0 });
    mockFindManyAcuerdo.mockResolvedValue([ACUERDO_PAGO]);
    mockFindManyUnidad.mockResolvedValue([
      { id: "u1", numeroUnidad: "MOV-1", modelo: "Flex 38", precioCliente: 24700, cliente: { nombre: "Juan" } },
      { id: "u2", numeroUnidad: "MOV-2", modelo: null, precioCliente: null, cliente: { nombre: "Ana" } },
    ]);
    mockAggregate.mockResolvedValueOnce({ _sum: { importe: 9000 } }).mockResolvedValueOnce({ _sum: { importe: null } });
    mockGetSignedUrl.mockResolvedValue("https://signed/x.pdf");
  });

  it("muestra el título Pagos y consulta solo acuerdos de tipo pago", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Pagos" })).toBeInTheDocument();
    expect(mockFindManyAcuerdo).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: "pago" } }));
  });

  it("una fila por unidad con el saldo de sus pagos a proveedores", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/filas=u1\|USD:en_curso:21000,u2\|USD:sin_plan:0 unidades=2 rol=admin/)).toBeInTheDocument();
    expect(mockGetSignedUrl).toHaveBeenCalledWith("documentos-movara", "pagos/x.pdf");
  });

  it("métricas: pagado este mes por moneda (pagos del mes en curso), pendiente y unidades con vencidas", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/pagadoUSD=9000 pagadoARS=0 pendienteUSD=21000/)).toBeInTheDocument();
    expect(screen.getByText(/completas=0 vencidas=1/)).toBeInTheDocument();
    const where = mockAggregate.mock.calls[0][0].where;
    expect(where.acuerdo).toEqual({ tipo: "pago", moneda: "USD" });
    expect(where.fecha.gte.getDate()).toBe(1);
    expect(mockAggregate.mock.calls[1][0].where.acuerdo).toEqual({ tipo: "pago", moneda: "ARS" });
  });

  it("corre el barrido de auto-vencimiento de cuotas", async () => {
    await AdminPagosPage({ searchParams: Promise.resolve({}) });
    expect(mockUpdateManyCuota).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ estado: "pendiente" }), data: { estado: "vencido" } })
    );
  });

  it("filtros desde la URL: alias de estado y moneda; sin sesión el rol es vendedor", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    render(await AdminPagosPage({ searchParams: Promise.resolve({ estado: "pagado", moneda: "ARS" }) }));
    expect(screen.getByText(/rol=vendedor/)).toBeInTheDocument();
    expect(screen.getByText(/estado=saldado moneda=ARS/)).toBeInTheDocument();
  });

  it("vence=semana gana sobre estado; moneda inválida cae a none", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({ estado: "con_saldo", vence: "semana", moneda: "EUR" }) }));
    expect(screen.getByText(/estado=semana moneda=none/)).toBeInTheDocument();
  });
});
