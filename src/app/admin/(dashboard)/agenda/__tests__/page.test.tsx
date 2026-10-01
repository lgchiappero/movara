import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindManyCita, mockFindManyDisp, mockGetAdminUser } = vi.hoisted(() => ({
  mockFindManyCita: vi.fn(),
  mockFindManyDisp: vi.fn(),
  mockGetAdminUser: vi.fn().mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" }),
}));

vi.mock("@/lib/db", () => ({
  db: { cita: { findMany: mockFindManyCita }, disponibilidadAgenda: { findMany: mockFindManyDisp } },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/components/admin/AgendaVistaPanel", () => ({
  default: ({
    anio,
    mesIdx0,
    vista,
    citasDelMes,
    todasLasCitas,
    citaIdInicial,
  }: {
    anio: number;
    mesIdx0: number;
    vista: string;
    citasDelMes: unknown[];
    todasLasCitas: unknown[];
    citaIdInicial?: string | null;
  }) => (
    <div>
      AgendaVistaPanel: {anio}-{mesIdx0} {vista} citasDelMes={citasDelMes.length} todas={todasLasCitas.length}{" "}
      citaIdInicial={citaIdInicial ?? "none"}
    </div>
  ),
}));
vi.mock("@/components/admin/DisponibilidadPanel", () => ({
  default: ({ anioInicial, mesInicial, disponibilidad, diasConCitas }: { anioInicial: number; mesInicial: number; disponibilidad: unknown[]; diasConCitas: unknown[] }) => (
    <div>
      DisponibilidadPanel: {anioInicial}-{mesInicial} disp={disponibilidad.length} diasConCitas={diasConCitas.length}
    </div>
  ),
}));

import AgendaAdminPage from "../page";

const CITA = {
  id: "c1",
  fecha: new Date("2026-06-15T00:00:00.000Z"),
  horario: "10:00",
  estado: "confirmada",
  tipoCliente: "particular",
  nombre: "Juan",
  email: "juan@x.com",
  telefono: "123",
  razonSocial: null,
  consulta: "Info",
  canceladaPor: null,
  motivoCancelacion: null,
};

describe("AgendaAdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindManyCita.mockResolvedValue([]);
    mockFindManyDisp.mockResolvedValue([]);
  });

  it("pasa citaId como citaIdInicial a AgendaVistaPanel (deep link 'resaltada' desde el dashboard)", async () => {
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ citaId: "c1" }) }));
    expect(screen.getByText(/citaIdInicial=c1/)).toBeInTheDocument();
  });

  it("sin citaId en el querystring, citaIdInicial es 'none'", async () => {
    render(await AgendaAdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/citaIdInicial=none/)).toBeInTheDocument();
  });

  it("sin parámetro 'mes', usa el mes actual", async () => {
    const now = new Date();
    render(await AgendaAdminPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByText(new RegExp(`AgendaVistaPanel: ${now.getFullYear()}-${now.getMonth()} `))
    ).toBeInTheDocument();
  });

  it("con un 'mes' válido, usa ese año/mes", async () => {
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ mes: "2026-06" }) }));
    expect(screen.getByText(/AgendaVistaPanel: 2026-5 /)).toBeInTheDocument();
  });

  it("con un 'mes' de formato inválido, cae al mes actual", async () => {
    const now = new Date();
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ mes: "no-es-fecha" }) }));
    expect(
      screen.getByText(new RegExp(`AgendaVistaPanel: ${now.getFullYear()}-${now.getMonth()} `))
    ).toBeInTheDocument();
  });

  it("con un 'mes' fuera de rango (mes=13), cae al mes actual", async () => {
    const now = new Date();
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ mes: "2026-13" }) }));
    expect(
      screen.getByText(new RegExp(`AgendaVistaPanel: ${now.getFullYear()}-${now.getMonth()} `))
    ).toBeInTheDocument();
  });

  it("vista=lista trae todasLasCitas; sin ese param, todasLasCitas queda vacío", async () => {
    mockFindManyCita.mockResolvedValueOnce([CITA]); // citasDelMes
    render(await AgendaAdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/todas=0/)).toBeInTheDocument();
  });

  it("vista=lista trae todasLasCitas también", async () => {
    mockFindManyCita.mockResolvedValueOnce([CITA]).mockResolvedValueOnce([CITA, CITA]);
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ vista: "lista" }) }));
    expect(screen.getByText(/AgendaVistaPanel:.*lista/)).toBeInTheDocument();
    expect(screen.getByText(/todas=2/)).toBeInTheDocument();
  });

  it("dispDesde válido y no anterior al mes actual se usa tal cual", async () => {
    const now = new Date();
    const futuro = new Date(Date.UTC(now.getFullYear() + 1, 0, 1));
    const key = `${futuro.getUTCFullYear()}-${String(futuro.getUTCMonth() + 1).padStart(2, "0")}`;
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ dispDesde: key }) }));
    expect(
      screen.getByText(new RegExp(`DisponibilidadPanel: ${futuro.getUTCFullYear()}-${futuro.getUTCMonth()} `))
    ).toBeInTheDocument();
  });

  it("dispDesde anterior al mes actual se ignora y cae al mes actual", async () => {
    const now = new Date();
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ dispDesde: "2020-01" }) }));
    expect(
      screen.getByText(new RegExp(`DisponibilidadPanel: ${now.getFullYear()}-${now.getMonth()} `))
    ).toBeInTheDocument();
  });

  it("dispDesde con formato inválido cae al mes actual", async () => {
    const now = new Date();
    render(await AgendaAdminPage({ searchParams: Promise.resolve({ dispDesde: "no-es-fecha" }) }));
    expect(
      screen.getByText(new RegExp(`DisponibilidadPanel: ${now.getFullYear()}-${now.getMonth()} `))
    ).toBeInTheDocument();
  });

  it("serializa la disponibilidad y calcula los días con citas activas (excluye canceladas por la query)", async () => {
    mockFindManyDisp.mockResolvedValueOnce([
      { fecha: new Date("2026-06-15T00:00:00.000Z"), habilitada: true, horarios: ["10:00"] },
    ]);
    render(await AgendaAdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/disp=1/)).toBeInTheDocument();
  });

  it("días con citas no se duplican aunque haya más de una cita el mismo día", async () => {
    // La query real ya filtra { estado: { not: "cancelada" } } — acá solo
    // verificamos que 2 citas el mismo día cuentan como 1 sola fecha.
    mockFindManyCita.mockImplementation(async (args: unknown) => {
      const a = args as { select?: unknown };
      if (a?.select) return [{ fecha: CITA.fecha }, { fecha: CITA.fecha }];
      return [];
    });
    render(await AgendaAdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/diasConCitas=1/)).toBeInTheDocument();
  });
});
