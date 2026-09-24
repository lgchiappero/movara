import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindManyCita, mockFindManyDisp } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindManyCita: vi.fn(),
  mockFindManyDisp: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    disponibilidadAgenda: { findUnique: mockFindUnique, findMany: mockFindManyDisp },
    cita: { findMany: mockFindManyCita },
  },
}));

import {
  getEstadoHorariosDelDia,
  getHorariosDisponibles,
  getEstadoDiasDelMes,
} from "@/lib/agenda/disponibilidad";
import { hoyFechaKey, addDiasFechaKey } from "@/lib/agenda/fecha";

describe("getEstadoHorariosDelDia", () => {
  beforeEach(() => vi.clearAllMocks());

  it("vacío si la fecha ya pasó — ni siquiera consulta la DB", async () => {
    const ayer = addDiasFechaKey(hoyFechaKey(), -1);
    const res = await getEstadoHorariosDelDia(ayer);
    expect(res).toEqual({ habilitados: [], ocupados: [] });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("vacío si el día no tiene fila de disponibilidad", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockFindManyCita.mockResolvedValueOnce([]);
    const manana = addDiasFechaKey(hoyFechaKey(), 1);
    const res = await getEstadoHorariosDelDia(manana);
    expect(res).toEqual({ habilitados: [], ocupados: [] });
  });

  it("vacío si el día existe pero está deshabilitado", async () => {
    mockFindUnique.mockResolvedValueOnce({ habilitada: false, horarios: ["10:00"] });
    mockFindManyCita.mockResolvedValueOnce([]);
    const manana = addDiasFechaKey(hoyFechaKey(), 1);
    const res = await getEstadoHorariosDelDia(manana);
    expect(res).toEqual({ habilitados: [], ocupados: [] });
  });

  it("devuelve habilitados y ocupados cuando el día está habilitado", async () => {
    mockFindUnique.mockResolvedValueOnce({ habilitada: true, horarios: ["10:00", "11:00", "12:00"] });
    mockFindManyCita.mockResolvedValueOnce([{ horario: "11:00" }]);
    const manana = addDiasFechaKey(hoyFechaKey(), 1);
    const res = await getEstadoHorariosDelDia(manana);
    expect(res).toEqual({ habilitados: ["10:00", "11:00", "12:00"], ocupados: ["11:00"] });
  });
});

describe("getHorariosDisponibles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("excluye los horarios ocupados de los habilitados", async () => {
    mockFindUnique.mockResolvedValueOnce({ habilitada: true, horarios: ["10:00", "11:00", "12:00"] });
    mockFindManyCita.mockResolvedValueOnce([{ horario: "11:00" }]);
    const manana = addDiasFechaKey(hoyFechaKey(), 1);
    const res = await getHorariosDisponibles(manana);
    expect(res).toEqual(["10:00", "12:00"]);
  });

  it("vacío si el día ya pasó", async () => {
    const ayer = addDiasFechaKey(hoyFechaKey(), -1);
    expect(await getHorariosDisponibles(ayer)).toEqual([]);
  });
});

describe("getEstadoDiasDelMes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca 'disponible' un día habilitado con horarios libres", async () => {
    const manana = addDiasFechaKey(hoyFechaKey(), 1);
    mockFindManyDisp.mockResolvedValueOnce([
      { fecha: new Date(`${manana}T00:00:00.000Z`), horarios: ["10:00", "11:00"] },
    ]);
    mockFindManyCita.mockResolvedValueOnce([]);

    const [anio, mes] = manana.split("-").map(Number);
    const res = await getEstadoDiasDelMes(anio, mes);
    expect(res[manana]).toBe("disponible");
  });

  it("marca 'completo' un día habilitado con todos los horarios ocupados", async () => {
    const manana = addDiasFechaKey(hoyFechaKey(), 1);
    mockFindManyDisp.mockResolvedValueOnce([
      { fecha: new Date(`${manana}T00:00:00.000Z`), horarios: ["10:00"] },
    ]);
    mockFindManyCita.mockResolvedValueOnce([{ fecha: new Date(`${manana}T00:00:00.000Z`), horario: "10:00" }]);

    const [anio, mes] = manana.split("-").map(Number);
    const res = await getEstadoDiasDelMes(anio, mes);
    expect(res[manana]).toBe("completo");
  });

  it("omite un día habilitado pero sin ningún horario cargado", async () => {
    const manana = addDiasFechaKey(hoyFechaKey(), 1);
    mockFindManyDisp.mockResolvedValueOnce([
      { fecha: new Date(`${manana}T00:00:00.000Z`), horarios: [] },
    ]);
    mockFindManyCita.mockResolvedValueOnce([]);

    const [anio, mes] = manana.split("-").map(Number);
    const res = await getEstadoDiasDelMes(anio, mes);
    expect(res[manana]).toBeUndefined();
  });

  it("omite un día ya pasado aunque venga habilitado en la respuesta de la DB", async () => {
    const ayer = addDiasFechaKey(hoyFechaKey(), -1);
    mockFindManyDisp.mockResolvedValueOnce([
      { fecha: new Date(`${ayer}T00:00:00.000Z`), horarios: ["10:00"] },
    ]);
    mockFindManyCita.mockResolvedValueOnce([]);

    const [anio, mes] = ayer.split("-").map(Number);
    const res = await getEstadoDiasDelMes(anio, mes);
    expect(res[ayer]).toBeUndefined();
  });
});
