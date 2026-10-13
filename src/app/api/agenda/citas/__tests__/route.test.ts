import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockSend, tx } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockSend: vi.fn(),
  tx: {
    disponibilidadAgenda: { findUnique: vi.fn() },
    cita: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    cita: { findFirst: mockFindFirst },
    lead: { findFirst: vi.fn().mockResolvedValue({ id: "l1" }), create: vi.fn() },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));
vi.mock("resend", () => ({ Resend: class { emails = { send: mockSend }; } }));

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

describe("POST /api/agenda/citas — emails", () => {
  it("si Resend devuelve { error }, la visita queda agendada (201) y se loguea id + tipo, sin datos personales", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.CONTACT_EMAIL = "contacto@movara.com.ar";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindFirst.mockResolvedValue(null);
    tx.disponibilidadAgenda.findUnique.mockResolvedValue({ habilitada: true, horarios: [CITA.horario] });
    tx.cita.findFirst.mockResolvedValue(null);
    tx.cita.create.mockImplementation(({ data }) => Promise.resolve({ id: "cita1", razonSocial: null, ...data }));
    mockSend.mockResolvedValue({ data: null, error: { name: "validation_error", statusCode: 422, message: "victima@example.com" } });

    const res = await POST(req(CITA));
    expect(res.status).toBe(201);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith("[agenda/citas] cita=cita1 Falló la confirmación al cliente: validation_error (422)");
    expect(log).toHaveBeenCalledWith("[agenda/citas] cita=cita1 Falló el aviso a MOVARA: validation_error (422)");
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/victima@example\.com|Atacante|5491100000000/);
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL;
  });
});
