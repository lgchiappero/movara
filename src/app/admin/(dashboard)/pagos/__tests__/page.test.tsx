import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockGetAdminUser, mockUpdateManyCuota, mockFindManyAcuerdo, mockFindManyUnidad } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockUpdateManyCuota: vi.fn(),
  mockFindManyAcuerdo: vi.fn(),
  mockFindManyUnidad: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    cuota: { updateMany: mockUpdateManyCuota },
    acuerdoPago: { findMany: mockFindManyAcuerdo },
    unidad: { findMany: mockFindManyUnidad },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/admin/storage", () => ({ getSignedUrl: vi.fn(), BUCKET_MOVARA: "documentos-movara" }));
vi.mock("@/components/admin/PagosPanel", () => ({
  default: (p: { acuerdos: unknown[]; unidades: unknown[]; rol: string; estadoInicial?: string; monedaInicial?: string }) => (
    <div>
      PagosPanel acuerdos={p.acuerdos.length} unidades={p.unidades.length} rol={p.rol} estado={p.estadoInicial ?? "none"}{" "}
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
  cuotas: [],
  movimientos: [],
};

describe("AdminPagosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue({ rol: "admin" });
    mockUpdateManyCuota.mockResolvedValue({ count: 0 });
    mockFindManyAcuerdo.mockResolvedValue([ACUERDO_PAGO]);
    mockFindManyUnidad.mockResolvedValue([{ id: "u1", numeroUnidad: "MOV-1", cliente: { nombre: "Juan" } }]);
  });

  it("muestra el título Pagos y consulta solo acuerdos de tipo pago", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Pagos" })).toBeInTheDocument();
    expect(mockFindManyAcuerdo).toHaveBeenCalledWith(expect.objectContaining({ where: { tipo: "pago" } }));
    expect(screen.getByText(/acuerdos=1 unidades=1 rol=admin/)).toBeInTheDocument();
  });

  it("corre el barrido de auto-vencimiento de cuotas", async () => {
    await AdminPagosPage({ searchParams: Promise.resolve({}) });
    expect(mockUpdateManyCuota).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ estado: "pendiente" }), data: { estado: "vencido" } })
    );
  });

  it("traduce los alias del dashboard: estado=pagado → saldado, vence=semana → semana", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({ estado: "pagado" }) }));
    expect(screen.getByText(/estado=saldado/)).toBeInTheDocument();
  });

  it("vence=semana gana sobre estado", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({ estado: "pendiente", vence: "semana" }) }));
    expect(screen.getByText(/estado=semana/)).toBeInTheDocument();
  });

  it("moneda válida se propaga; inválida cae a none; sin sesión el rol es vendedor", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    render(await AdminPagosPage({ searchParams: Promise.resolve({ moneda: "ARS", estado: "pendiente" }) }));
    expect(screen.getByText(/rol=vendedor estado=pendiente moneda=ARS/)).toBeInTheDocument();
  });

  it("una moneda fuera de USD/ARS cae a none", async () => {
    render(await AdminPagosPage({ searchParams: Promise.resolve({ moneda: "EUR" }) }));
    expect(screen.getByText(/moneda=none/)).toBeInTheDocument();
  });
});
