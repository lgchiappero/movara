import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst } = vi.hoisted(() => ({ mockFindFirst: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { cita: { findFirst: mockFindFirst } } }));

import { POST } from "../route";
import { NextRequest } from "next/server";
import { addDiasFechaKey, hoyFechaKey } from "@/lib/agenda/fecha";
import { HORARIOS_AGENDA } from "@/lib/agenda/horarios";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/agenda/citas", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
  });
}

const CITA = {
  fecha: addDiasFechaKey(hoyFechaKey(), 3),
  horario: HORARIOS_AGENDA[0],
  tipoCliente: "particular",
  nombre: "Atacante",
  email: "victima@example.com",
  telefono: "+5491100000000",
  consulta: "",
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/agenda/citas — visita duplicada", () => {
  it("el 409 no expone id, fecha ni horario de la visita existente", async () => {
    mockFindFirst.mockResolvedValue({
      id: "cita-secreta",
      fecha: new Date("2026-12-01T00:00:00.000Z"),
      horario: "10:00",
    });
    const res = await POST(req(CITA));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({ error: "Ya tenés una visita agendada con este email", code: "cita-duplicada" });
    const texto = JSON.stringify(json);
    expect(texto).not.toContain("cita-secreta");
    expect(texto).not.toContain("2026-12-01");
  });
});
