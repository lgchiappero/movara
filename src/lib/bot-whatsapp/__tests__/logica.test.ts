import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  upsert: vi.fn(),
  usoFind: vi.fn(),
  leadFind: vi.fn(),
  clienteFind: vi.fn(),
  pedidoFind: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  sesion: vi.fn(),
  consumir: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    configBot: { upsert: m.upsert },
    usoBot: { findUnique: m.usoFind },
    lead: { findMany: m.leadFind },
    cliente: { findMany: m.clienteFind },
    configuracionPedido: { findMany: m.pedidoFind },
    leadWhatsapp: { count: m.count, findMany: m.findMany },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.sesion }));
vi.mock("@/lib/rate-limit-db", async (orig) => ({ ...(await orig<typeof import("@/lib/rate-limit-db")>()), consumirRateLimit: m.consumir }));

import { claveDeTelefonoWhatsapp, formatearTelefonoWhatsapp, telefonoWhatsapp } from "../telefono";
import { calcularGasto, gastoDelMes, mesActual, obtenerConfigBot } from "../config";
import { HORARIO_POR_DEFECTO, MENSAJE_BIENVENIDA_POR_DEFECTO } from "../constantes";
import { exigirSesion, SOLO_ADMIN } from "../permisos";
import { buscarCoincidencias } from "../coincidencias";
import { listarLeads } from "../leads";
import { codigoPrisma, leerYValidar } from "../http";
import { z } from "zod";

const ADMIN = { id: "a1", nombre: "Luciano", email: "luciano@movara.com.ar", rol: "admin" as const };
const VENDEDOR = { id: "v1", nombre: "Vera", email: "vera@movara.com.ar", rol: "vendedor" as const };

beforeEach(() => {
  vi.clearAllMocks();
  m.consumir.mockResolvedValue(true);
});

describe("teléfonos", () => {
  it.each([
    ["+54 9 3493 66-7214", "5493493667214"],
    ["03493 15 667214", "5493493667214"],
    ["3493 667214", "5493493667214"],
    ["5493493667214", "5493493667214"],
    ["+54 11 1234-5678", "5491112345678"],
    ["011 15 1234 5678", "5491112345678"],
    ["+1 (555) 123-4567", "15551234567"],
    ["0034 612 345 678", "34612345678"],
  ])("%s → %s", (entrada, esperado) => {
    expect(telefonoWhatsapp(entrada)).toBe(esperado);
  });

  it.each(["", "123", "hola", null, undefined, "+1 23"])("inválido: %s", (entrada) => {
    expect(telefonoWhatsapp(entrada)).toBeNull();
  });

  it("clave de 10 dígitos para cruzar con Leads y Clientes", () => {
    expect(claveDeTelefonoWhatsapp("5493493667214")).toBe("3493667214");
  });

  it("formato para mostrar", () => {
    expect(formatearTelefonoWhatsapp("5493493667214")).toBe("+54 9 3493 66-7214");
    expect(formatearTelefonoWhatsapp("5491112345678")).toBe("+54 9 11 1234-5678");
    expect(formatearTelefonoWhatsapp("15551234567")).toBe("+15551234567");
  });
});

describe("configuración y gasto", () => {
  it("la primera lectura crea la configuración con el bot APAGADO y los valores por defecto", async () => {
    m.upsert.mockResolvedValue({ id: "unico", activo: false });
    await obtenerConfigBot();
    const { create, update, where } = m.upsert.mock.calls[0][0];
    expect(where).toEqual({ id: "unico" });
    expect(update).toEqual({});
    expect(create).toEqual({ id: "unico", horarioAtencion: HORARIO_POR_DEFECTO, mensajeBienvenida: MENSAJE_BIENVENIDA_POR_DEFECTO });
    expect(HORARIO_POR_DEFECTO.lun).toEqual([{ desde: "08:00", hasta: "18:00" }]);
    expect(HORARIO_POR_DEFECTO.sab).toEqual([{ desde: "09:00", hasta: "13:00" }]);
    expect(HORARIO_POR_DEFECTO.dom).toEqual([]);
  });

  it("mes en hora argentina", () => {
    expect(mesActual(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
    expect(mesActual(new Date("2026-12-01T04:00:00Z"))).toBe("2026-12");
  });

  it("niveles: normal, amarillo desde 80 % y rojo al 100 %", () => {
    expect(calcularGasto("2026-11", 0, 5)).toMatchObject({ nivel: "normal", porcentaje: 0 });
    expect(calcularGasto("2026-11", 3.99, 5).nivel).toBe("normal");
    expect(calcularGasto("2026-11", 4, 5).nivel).toBe("aviso");
    expect(calcularGasto("2026-11", 5, 5).nivel).toBe("tope");
    expect(calcularGasto("2026-11", 1, 0).nivel).toBe("tope");
    expect(calcularGasto("2026-11", 0, 0).nivel).toBe("normal");
  });

  it("gasto del mes en curso (0 si todavía no hay uso)", async () => {
    m.usoFind.mockResolvedValueOnce(null).mockResolvedValueOnce({ costoUsd: 4.5 });
    expect(await gastoDelMes(5, new Date("2026-11-18T15:00:00Z"))).toMatchObject({ mes: "2026-11", costoUsd: 0, topeUsd: 5 });
    expect(m.usoFind).toHaveBeenCalledWith({ where: { mes: "2026-11" } });
    expect((await gastoDelMes(5)).nivel).toBe("aviso");
  });
});

describe("permisos (validados en el servidor)", () => {
  it("sin sesión: 401", async () => {
    m.sesion.mockResolvedValue(null);
    const r = await exigirSesion();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.respuesta.status).toBe(401);
  });

  it("vendedor en una acción de solo administrador: 403 con mensaje", async () => {
    m.sesion.mockResolvedValue(VENDEDOR);
    const r = await exigirSesion({ soloAdmin: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.respuesta.status).toBe(403);
      expect(await r.respuesta.json()).toEqual({ error: SOLO_ADMIN });
    }
  });

  it("vendedor en lo que sí puede, y administrador en todo", async () => {
    m.sesion.mockResolvedValue(VENDEDOR);
    expect((await exigirSesion({ escritura: true })).ok).toBe(true);
    m.sesion.mockResolvedValue(ADMIN);
    expect((await exigirSesion({ soloAdmin: true, escritura: true })).ok).toBe(true);
  });

  it("escrituras con rate limit por usuario (120 por minuto): 429 sin cupo", async () => {
    m.sesion.mockResolvedValue(ADMIN);
    m.consumir.mockResolvedValueOnce(false);
    const r = await exigirSesion({ escritura: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.respuesta.status).toBe(429);
    expect(m.consumir).toHaveBeenCalledWith(expect.stringMatching(/^bot-whatsapp:[a-f0-9]{64}$/), 120, 60_000);
  });

  it("las lecturas no consumen el rate limit", async () => {
    m.sesion.mockResolvedValue(ADMIN);
    await exigirSesion();
    expect(m.consumir).not.toHaveBeenCalled();
  });
});

describe("coincidencias con Leads y Pedidos (solo lectura)", () => {
  it("busca por la clave en leads y clientes y junta sus pedidos", async () => {
    m.leadFind.mockResolvedValue([{ id: "l1" }]);
    m.clienteFind.mockResolvedValue([{ id: "c1" }]);
    m.pedidoFind.mockResolvedValue([
      { id: "p1", numeroPedido: "MOV-2026-010", numeroConsulta: "MOV-CONSULTA-2026-050" },
      { id: "p2", numeroPedido: null, numeroConsulta: "MOV-CONSULTA-2026-051" },
    ]);
    const r = await buscarCoincidencias("5493493667214");
    expect(m.leadFind).toHaveBeenCalledWith({ where: { telefonoNorm: "3493667214" }, select: { id: true } });
    expect(m.pedidoFind.mock.calls[0][0].where).toEqual({ OR: [{ leadId: { in: ["l1"] } }, { clienteId: { in: ["c1"] } }] });
    expect(r).toEqual({ leads: 1, pedidos: [{ id: "p1", numero: "MOV-2026-010" }, { id: "p2", numero: "MOV-CONSULTA-2026-051" }] });
  });

  it("sin coincidencias no busca pedidos; con solo un cliente, busca por cliente", async () => {
    m.leadFind.mockResolvedValue([]);
    m.clienteFind.mockResolvedValueOnce([]);
    expect(await buscarCoincidencias("5493493667214")).toEqual({ leads: 0, pedidos: [] });
    expect(m.pedidoFind).not.toHaveBeenCalled();
    m.clienteFind.mockResolvedValueOnce([{ id: "c9" }]);
    m.pedidoFind.mockResolvedValueOnce([]);
    await buscarCoincidencias("5493493667214");
    expect(m.pedidoFind.mock.calls[0][0].where).toEqual({ OR: [{ clienteId: { in: ["c9"] } }] });
  });

  it("un teléfono sin clave no consulta nada", async () => {
    expect(await buscarCoincidencias("12")).toEqual({ leads: 0, pedidos: [] });
    expect(m.leadFind).not.toHaveBeenCalled();
  });
});

describe("listado de leads", () => {
  it("filtra por estado, busca por nombre o dígitos del teléfono, ordena por último mensaje y pagina", async () => {
    m.count.mockResolvedValue(120);
    m.findMany.mockResolvedValue([]);
    const r = await listarLeads({ estado: "CALIFICADO", q: "3493 66", pagina: 2 });
    const args = m.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      estado: "CALIFICADO",
      OR: [{ nombre: { contains: "3493 66", mode: "insensitive" } }, { telefono: { contains: "349366" } }],
    });
    expect(args.orderBy).toEqual([{ ultimoMensajeEn: { sort: "desc", nulls: "last" } }, { creadoEn: "desc" }]);
    expect(args.skip).toBe(50);
    expect(r).toMatchObject({ total: 120, pagina: 2, paginas: 3 });
  });

  it("búsqueda por nombre sola (menos de 3 dígitos no busca en el teléfono) y sin filtros", async () => {
    m.count.mockResolvedValue(0);
    m.findMany.mockResolvedValue([]);
    await listarLeads({ q: "Ana", pagina: 1 });
    expect(m.findMany.mock.calls[0][0].where).toEqual({ OR: [{ nombre: { contains: "Ana", mode: "insensitive" } }] });
    expect((await listarLeads({ pagina: 1 })).paginas).toBe(1);
    expect(m.findMany.mock.calls[1][0].where).toEqual({});
  });
});

describe("http", () => {
  it("leerYValidar: 413 si es grande, 400 con el primer error, datos si valida", async () => {
    const esquema = z.object({ a: z.number({ message: "a es número" }) });
    const req = (body: string) => new Request("http://x", { method: "POST", body });
    const grande = await leerYValidar(req(JSON.stringify({ a: "x".repeat(20_000) })), esquema);
    expect(!grande.ok && grande.respuesta.status).toBe(413);
    const malo = await leerYValidar(req(JSON.stringify({ a: "1" })), esquema);
    expect(!malo.ok && (await malo.respuesta.json())).toEqual({ error: "a es número" });
    expect(await leerYValidar(req(JSON.stringify({ a: 1 })), esquema)).toEqual({ ok: true, datos: { a: 1 } });
    const sinMensaje = await leerYValidar(req("null"), z.object({}).strict());
    expect(!sinMensaje.ok && sinMensaje.respuesta.status).toBe(400);
  });

  it("codigoPrisma", () => {
    expect(codigoPrisma({ code: "P2002" })).toBe("P2002");
    expect(codigoPrisma(new Error("x"))).toBeNull();
    expect(codigoPrisma(null)).toBeNull();
  });
});
