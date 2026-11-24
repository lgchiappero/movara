import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  sesion: vi.fn(),
  consumir: vi.fn(),
  configUpsert: vi.fn(),
  configUpdate: vi.fn(),
  usoFind: vi.fn(),
  leadCount: vi.fn(),
  leadFindMany: vi.fn(),
  leadFindUnique: vi.fn(),
  leadCreate: vi.fn(),
  leadUpdate: vi.fn(),
  leadDelete: vi.fn(),
  exclFindMany: vi.fn(),
  exclCreate: vi.fn(),
  exclDelete: vi.fn(),
  exclCreateMany: vi.fn(),
  leadsFormFind: vi.fn(),
  clientesFind: vi.fn(),
  pedidosFind: vi.fn(),
}));

vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.sesion }));
vi.mock("@/lib/rate-limit-db", async (orig) => ({
  ...(await orig<typeof import("@/lib/rate-limit-db")>()),
  consumirRateLimit: m.consumir,
}));
vi.mock("@/lib/db", () => ({
  db: {
    configBot: { upsert: m.configUpsert, update: m.configUpdate },
    usoBot: { findUnique: m.usoFind },
    leadWhatsapp: {
      count: m.leadCount,
      findMany: m.leadFindMany,
      findUnique: m.leadFindUnique,
      create: m.leadCreate,
      update: m.leadUpdate,
      delete: m.leadDelete,
    },
    contactoExcluido: { findMany: m.exclFindMany, create: m.exclCreate, delete: m.exclDelete, createMany: m.exclCreateMany },
    lead: { findMany: m.leadsFormFind },
    cliente: { findMany: m.clientesFind },
    configuracionPedido: { findMany: m.pedidosFind },
  },
}));

import * as config from "../config/route";
import * as leads from "../leads/route";
import * as lead from "../leads/[id]/route";
import * as excluidos from "../excluidos/route";
import * as excluido from "../excluidos/[id]/route";
import * as importar from "../excluidos/importar/route";
import { MAX_IMPORTAR_EXCLUIDOS } from "@/lib/validators/bot-whatsapp";

const ADMIN = { id: "a1", nombre: "Luciano", email: "luciano@movara.com.ar", rol: "admin" as const };
const VENDEDOR = { id: "v1", nombre: "Vera", email: "vera@movara.com.ar", rol: "vendedor" as const };

const CONFIG = {
  id: "unico",
  activo: false,
  modoHorario: false,
  horarioAtencion: {},
  modoRespaldo: "MENSAJE_BIENVENIDA",
  mensajeBienvenida: "Hola",
  topeGastoMensualUsd: 5,
  emailAviso: null,
  whatsappAviso: null,
  maxRespuestasPorLead: 6,
};

const URL_BASE = "http://localhost/api/admin/bot-whatsapp";
const req = (ruta: string, metodo = "GET", body?: unknown) =>
  new Request(`${URL_BASE}${ruta}`, {
    method: metodo,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
  });
const ctx = (id = "l1") => ({ params: Promise.resolve({ id }) });
const errorPrisma = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue(ADMIN);
  m.consumir.mockResolvedValue(true);
  m.configUpsert.mockResolvedValue(CONFIG);
  m.usoFind.mockResolvedValue(null);
  m.leadsFormFind.mockResolvedValue([]);
  m.clientesFind.mockResolvedValue([]);
  m.pedidosFind.mockResolvedValue([]);
});

describe("sin sesión: todas las rutas responden 401 y no tocan la base", () => {
  const llamadas: [string, () => Promise<Response>][] = [
    ["GET config", () => config.GET()],
    ["PATCH config", () => config.PATCH(req("/config", "PATCH", { activo: true }))],
    ["GET leads", () => leads.GET(req("/leads"))],
    ["POST leads", () => leads.POST(req("/leads", "POST", { telefono: "3493667214" }))],
    ["GET lead", () => lead.GET(req("/leads/l1"), ctx())],
    ["PATCH lead", () => lead.PATCH(req("/leads/l1", "PATCH", { estado: "VISITA" }), ctx())],
    ["DELETE lead", () => lead.DELETE(req("/leads/l1", "DELETE"), ctx())],
    ["GET excluidos", () => excluidos.GET()],
    ["POST excluidos", () => excluidos.POST(req("/excluidos", "POST", { telefono: "3493667214", etiqueta: "AMIGO" }))],
    ["DELETE excluido", () => excluido.DELETE(req("/excluidos/e1", "DELETE"), ctx("e1"))],
    ["POST importar excluidos", () => importar.POST(req("/excluidos/importar", "POST", { contactos: [{ telefono: "3493667214", nombre: "Ana" }], confirmar: true }))],
  ];
  it.each(llamadas)("%s", async (_, llamar) => {
    m.sesion.mockResolvedValue(null);
    expect((await llamar()).status).toBe(401);
    for (const fn of [m.configUpsert, m.configUpdate, m.leadFindMany, m.leadCreate, m.leadUpdate, m.leadDelete, m.exclCreate, m.exclDelete, m.exclFindMany, m.exclCreateMany]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("vendedor: lo que NO puede hacer (403, validado en el servidor)", () => {
  beforeEach(() => m.sesion.mockResolvedValue(VENDEDOR));

  it("prender o apagar el bot", async () => {
    const res = await config.PATCH(req("/config", "PATCH", { activo: true }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Solo un administrador puede hacer esto" });
    expect(m.configUpdate).not.toHaveBeenCalled();
  });

  it("cambiar la configuración", async () => {
    expect((await config.PATCH(req("/config", "PATCH", { topeGastoMensualUsd: 100 }))).status).toBe(403);
    expect(m.configUpdate).not.toHaveBeenCalled();
  });

  it("borrar un lead", async () => {
    expect((await lead.DELETE(req("/leads/l1", "DELETE"), ctx())).status).toBe(403);
    expect(m.leadDelete).not.toHaveBeenCalled();
  });

  it("borrar un contacto excluido", async () => {
    expect((await excluido.DELETE(req("/excluidos/e1", "DELETE"), ctx("e1"))).status).toBe(403);
    expect(m.exclDelete).not.toHaveBeenCalled();
  });

  it("importar excluidos desde un .vcf (ni el resumen)", async () => {
    for (const confirmar of [false, true]) {
      const res = await importar.POST(req("/excluidos/importar", "POST", { contactos: [{ telefono: "3493667214", nombre: "Ana" }], confirmar }));
      expect(res.status).toBe(403);
    }
    expect(m.exclFindMany).not.toHaveBeenCalled();
    expect(m.exclCreateMany).not.toHaveBeenCalled();
  });

  it("el 403 llega antes de leer el body (ni lo valida ni consume rate limit)", async () => {
    expect((await config.PATCH(req("/config", "PATCH", "no-json"))).status).toBe(403);
    expect(m.consumir).not.toHaveBeenCalled();
  });
});

describe("vendedor: lo que SÍ puede hacer", () => {
  beforeEach(() => m.sesion.mockResolvedValue(VENDEDOR));

  it("ver la configuración y el gasto del mes", async () => {
    m.usoFind.mockResolvedValue({ costoUsd: 4.2 });
    const res = await config.GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.config.activo).toBe(false);
    expect(json.gasto).toMatchObject({ costoUsd: 4.2, topeUsd: 5, nivel: "aviso" });
  });

  it("ver leads y el detalle con la conversación", async () => {
    m.leadCount.mockResolvedValue(1);
    m.leadFindMany.mockResolvedValue([{ id: "l1" }]);
    expect((await leads.GET(req("/leads?estado=NUEVO&q=ana"))).status).toBe(200);
    m.leadFindUnique.mockResolvedValue({ id: "l1", telefono: "5493493667214", mensajes: [] });
    expect((await lead.GET(req("/leads/l1"), ctx())).status).toBe(200);
  });

  it("editar calificación, estado, notas, próximo contacto y tomar control", async () => {
    m.leadUpdate.mockResolvedValue({ id: "l1" });
    const res = await lead.PATCH(
      req("/leads/l1", "PATCH", { estado: "CALIFICADO", zona: "Rafaela", notas: "Llamar", proximoContacto: "2026-12-01", controlHumano: true }),
      ctx()
    );
    expect(res.status).toBe(200);
    expect(m.leadUpdate.mock.calls[0][0].data).toMatchObject({ estado: "CALIFICADO", zona: "Rafaela", controlHumano: true });
  });

  it("agregar un lead manual y un contacto excluido", async () => {
    m.leadCreate.mockResolvedValue({ id: "l9" });
    expect((await leads.POST(req("/leads", "POST", { telefono: "3493 667214", nombre: "Ana" }))).status).toBe(201);
    m.exclCreate.mockResolvedValue({ id: "e1" });
    expect((await excluidos.POST(req("/excluidos", "POST", { telefono: "3493 111111", etiqueta: "PROVEEDOR" }))).status).toBe(201);
    expect(m.exclCreate.mock.calls[0][0].data.creadoPor).toBe("vera@movara.com.ar");
  });
});

describe("administrador", () => {
  it("prende el bot y queda registrado quién lo cambió", async () => {
    m.configUpdate.mockResolvedValue({ ...CONFIG, activo: true });
    const res = await config.PATCH(req("/config", "PATCH", { activo: true }));
    expect(res.status).toBe(200);
    expect(m.configUpdate).toHaveBeenCalledWith({ where: { id: "unico" }, data: { activo: true, actualizadoPor: "luciano@movara.com.ar" } });
    expect(m.configUpsert).toHaveBeenCalled(); // la configuración existe antes de actualizar
    expect((await res.json()).config.activo).toBe(true);
  });

  it("cambia la configuración completa (horario, respaldo, tope, avisos)", async () => {
    m.configUpdate.mockResolvedValue(CONFIG);
    const horario = { lun: [{ desde: "09:00", hasta: "17:00" }], mar: [], mie: [], jue: [], vie: [], sab: [], dom: [] };
    const res = await config.PATCH(
      req("/config", "PATCH", {
        modoHorario: true,
        horarioAtencion: horario,
        modoRespaldo: "NINGUNO",
        topeGastoMensualUsd: 10,
        emailAviso: "aviso@movara.com.ar",
        whatsappAviso: "3493 667214",
        maxRespuestasPorLead: 8,
      })
    );
    expect(res.status).toBe(200);
    expect(m.configUpdate.mock.calls[0][0].data).toMatchObject({ horarioAtencion: horario, whatsappAviso: "5493493667214", maxRespuestasPorLead: 8 });
  });

  it("borra un lead (y su conversación, por la cascada) y un excluido", async () => {
    m.leadDelete.mockResolvedValue({});
    expect((await lead.DELETE(req("/leads/l1", "DELETE"), ctx())).status).toBe(200);
    expect(m.leadDelete).toHaveBeenCalledWith({ where: { id: "l1" } });
    m.exclDelete.mockResolvedValue({});
    expect((await excluido.DELETE(req("/excluidos/e1", "DELETE"), ctx("e1"))).status).toBe(200);
  });
});

describe("validación, tamaño y rate limit", () => {
  it("400 con el primer error de validación", async () => {
    const res = await config.PATCH(req("/config", "PATCH", { topeGastoMensualUsd: -3 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No puede ser negativo" });
    expect((await leads.POST(req("/leads", "POST", { telefono: "12" }))).status).toBe(400);
    expect((await lead.PATCH(req("/leads/l1", "PATCH", {}), ctx())).status).toBe(400);
    expect((await excluidos.POST(req("/excluidos", "POST", { telefono: "3493667214", etiqueta: "VECINO" }))).status).toBe(400);
    expect(m.configUpdate).not.toHaveBeenCalled();
  });

  it("400 con un filtro inválido en el listado", async () => {
    expect((await leads.GET(req("/leads?estado=INVENTADO"))).status).toBe(400);
  });

  it("400 si el body trae un campo que no existe (esquemas estrictos)", async () => {
    expect((await lead.PATCH(req("/leads/l1", "PATCH", { telefono: "3493667214" }), ctx())).status).toBe(400);
    expect(m.leadUpdate).not.toHaveBeenCalled();
  });

  it("413 con un body de más de 16 KB", async () => {
    expect((await lead.PATCH(req("/leads/l1", "PATCH", { notas: "x".repeat(17 * 1024) }), ctx())).status).toBe(413);
    expect(m.leadUpdate).not.toHaveBeenCalled();
  });

  it("429 al pasar el límite de escrituras por usuario; las lecturas no lo consumen", async () => {
    m.consumir.mockResolvedValue(false);
    expect((await leads.POST(req("/leads", "POST", { telefono: "3493667214" }))).status).toBe(429);
    expect((await excluidos.POST(req("/excluidos", "POST", { telefono: "3493667214", etiqueta: "AMIGO" }))).status).toBe(429);
    expect(m.leadCreate).not.toHaveBeenCalled();
    m.consumir.mockClear();
    m.exclFindMany.mockResolvedValue([]);
    expect((await excluidos.GET()).status).toBe(200);
    expect(m.consumir).not.toHaveBeenCalled();
  });
});

describe("casos de cada ruta", () => {
  it("POST lead con teléfono repetido: 409 con el id del existente", async () => {
    m.leadCreate.mockRejectedValue(errorPrisma("P2002"));
    m.leadFindUnique.mockResolvedValue({ id: "l7" });
    const res = await leads.POST(req("/leads", "POST", { telefono: "+54 9 3493 66-7214" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Ya hay un lead con ese teléfono", id: "l7" });
    expect(m.leadFindUnique).toHaveBeenCalledWith({ where: { telefono: "5493493667214" }, select: { id: true } });
  });

  it("POST lead repetido, pero el existente se borró en el medio: 409 sin id", async () => {
    m.leadCreate.mockRejectedValue(errorPrisma("P2002"));
    m.leadFindUnique.mockResolvedValue(null);
    const res = await leads.POST(req("/leads", "POST", { telefono: "3493667214" }));
    expect(res.status).toBe(409);
    expect((await res.json()).id).toBeNull();
  });

  it("POST lead: un error inesperado de la base no se esconde", async () => {
    m.leadCreate.mockRejectedValue(new Error("db caída"));
    await expect(leads.POST(req("/leads", "POST", { telefono: "3493667214" }))).rejects.toThrow("db caída");
  });

  it("GET lead: 404 si no existe; con coincidencias en Leads y Pedidos", async () => {
    m.leadFindUnique.mockResolvedValueOnce(null);
    expect((await lead.GET(req("/leads/x"), ctx("x"))).status).toBe(404);

    m.leadFindUnique.mockResolvedValueOnce({ id: "l1", telefono: "5493493667214", mensajes: [{ id: "m1" }] });
    m.leadsFormFind.mockResolvedValue([{ id: "lf1" }]);
    m.pedidosFind.mockResolvedValue([{ id: "p1", numeroPedido: "MOV-2026-001", numeroConsulta: null }]);
    const json = await (await lead.GET(req("/leads/l1"), ctx())).json();
    expect(json.coincidencias).toEqual({ leads: 1, pedidos: [{ id: "p1", numero: "MOV-2026-001" }] });
    expect(json.lead.mensajes).toHaveLength(1);
  });

  it("PATCH y DELETE de un lead que no existe: 404; otro error se propaga", async () => {
    m.leadUpdate.mockRejectedValueOnce(errorPrisma("P2025"));
    expect((await lead.PATCH(req("/leads/x", "PATCH", { estado: "VISITA" }), ctx("x"))).status).toBe(404);
    m.leadDelete.mockRejectedValueOnce(errorPrisma("P2025"));
    expect((await lead.DELETE(req("/leads/x", "DELETE"), ctx("x"))).status).toBe(404);
    m.leadUpdate.mockRejectedValueOnce(new Error("otro"));
    await expect(lead.PATCH(req("/leads/x", "PATCH", { estado: "VISITA" }), ctx("x"))).rejects.toThrow("otro");
    m.leadDelete.mockRejectedValueOnce(new Error("otro"));
    await expect(lead.DELETE(req("/leads/x", "DELETE"), ctx("x"))).rejects.toThrow("otro");
  });

  it("PATCH lead: solo se manda a la base lo que vino en el body", async () => {
    m.leadUpdate.mockResolvedValue({ id: "l1" });
    await lead.PATCH(req("/leads/l1", "PATCH", { controlHumano: false }), ctx());
    expect(m.leadUpdate).toHaveBeenCalledWith({ where: { id: "l1" }, data: { controlHumano: false } });
  });

  it("excluidos: listado, repetido (409), inexistente al borrar (404) y otros errores", async () => {
    m.exclFindMany.mockResolvedValue([{ id: "e1" }]);
    expect(await (await excluidos.GET()).json()).toEqual({ excluidos: [{ id: "e1" }] });
    m.exclCreate.mockRejectedValueOnce(errorPrisma("P2002"));
    const repetido = await excluidos.POST(req("/excluidos", "POST", { telefono: "3493667214", etiqueta: "AMIGO" }));
    expect(repetido.status).toBe(409);
    expect(await repetido.json()).toEqual({ error: "Ese teléfono ya está excluido" });
    m.exclCreate.mockRejectedValueOnce(new Error("otro"));
    await expect(excluidos.POST(req("/excluidos", "POST", { telefono: "3493667214", etiqueta: "AMIGO" }))).rejects.toThrow("otro");
    m.exclDelete.mockRejectedValueOnce(errorPrisma("P2025"));
    expect((await excluido.DELETE(req("/excluidos/x", "DELETE"), ctx("x"))).status).toBe(404);
    m.exclDelete.mockRejectedValueOnce(new Error("otro"));
    await expect(excluido.DELETE(req("/excluidos/x", "DELETE"), ctx("x"))).rejects.toThrow("otro");
  });
});

describe("importar excluidos (.vcf, administrador)", () => {
  const CONTACTOS = [
    { telefono: "+54 9 3493 66-7214", nombre: "Sofía Martínez" },
    { telefono: "03493 15 667214", nombre: "Sofía repetida" },
    { telefono: "3493 111111", nombre: "Ya estaba" },
    { telefono: "15 555123", nombre: "Sin área" },
    { telefono: "3493 222222", nombre: null },
  ];
  const RESUMEN = { agregar: 2, saltear: 3, repetidos: 1, yaExcluidos: 1, invalidos: 1, completados: 0, caracteristica: null };
  beforeEach(() => m.exclFindMany.mockResolvedValue([{ telefono: "5493493111111" }]));

  it("sin confirmar: devuelve el resumen y no guarda nada", async () => {
    const res = await importar.POST(req("/excluidos/importar", "POST", { contactos: CONTACTOS, confirmar: false }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resumen: RESUMEN, agregados: 0 });
    expect(m.exclFindMany).toHaveBeenCalledWith({
      where: { telefono: { in: ["5493493667214", "5493493111111", "5493493222222"] } }, // "15 555123" sin característica no es válido
      select: { telefono: true },
    });
    expect(m.exclCreateMany).not.toHaveBeenCalled();
    expect(m.consumir).toHaveBeenCalled();
  });

  it("confirmado: agrega los nuevos con el nombre como etiqueta y saltea duplicados", async () => {
    m.exclCreateMany.mockResolvedValue({ count: 2 });
    const res = await importar.POST(req("/excluidos/importar", "POST", { contactos: CONTACTOS, confirmar: true }));
    expect(await res.json()).toEqual({ resumen: RESUMEN, agregados: 2 });
    expect(m.exclCreateMany).toHaveBeenCalledWith({
      data: [
        { telefono: "5493493667214", etiqueta: "Sofía Martínez", creadoPor: ADMIN.email },
        { telefono: "5493493222222", etiqueta: "OTRO", creadoPor: ADMIN.email },
      ],
      skipDuplicates: true,
    });
  });

  it("confirmado sin nada nuevo: no llama a la base para insertar", async () => {
    const res = await importar.POST(req("/excluidos/importar", "POST", { contactos: [CONTACTOS[2]], confirmar: true }));
    expect(await res.json()).toEqual({ resumen: { agregar: 0, saltear: 1, repetidos: 0, yaExcluidos: 1, invalidos: 0, completados: 0, caracteristica: null }, agregados: 0 });
    expect(m.exclCreateMany).not.toHaveBeenCalled();
  });

  it("con característica por defecto: completa los números sin código de área y los cuenta", async () => {
    m.exclCreateMany.mockResolvedValue({ count: 3 });
    const res = await importar.POST(req("/excluidos/importar", "POST", { contactos: CONTACTOS, caracteristica: " 03493 ", confirmar: true }));
    expect(await res.json()).toEqual({
      resumen: { agregar: 3, saltear: 2, repetidos: 1, yaExcluidos: 1, invalidos: 0, completados: 1, caracteristica: "3493" },
      agregados: 3,
    });
    expect(m.exclCreateMany.mock.calls[0][0].data.map((d: { telefono: string }) => d.telefono)).toEqual(["5493493667214", "5493493555123", "5493493222222"]);
    expect(m.exclCreateMany.mock.calls[0][0].data[1]).toMatchObject({ etiqueta: "Sin área" });
  });

  it("característica vacía no completa; inválida: 400", async () => {
    const vacia = await importar.POST(req("/excluidos/importar", "POST", { contactos: CONTACTOS, caracteristica: "  ", confirmar: false }));
    expect((await vacia.json()).resumen).toEqual(RESUMEN);
    for (const c of ["0", "12345", "abc", "0011"]) {
      const res = await importar.POST(req("/excluidos/importar", "POST", { contactos: CONTACTOS, caracteristica: c, confirmar: false }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Característica inválida: de 2 a 4 dígitos, ej. 3493" });
    }
  });

  it("valida: lista vacía, demasiados, campos de más, body enorme y rate limit", async () => {
    const vacia = await importar.POST(req("/excluidos/importar", "POST", { contactos: [], confirmar: false }));
    expect(vacia.status).toBe(400);
    expect(await vacia.json()).toEqual({ error: "El archivo no tiene contactos con teléfono" });
    const muchos = Array.from({ length: MAX_IMPORTAR_EXCLUIDOS + 1 }, () => ({ telefono: "1", nombre: null }));
    expect((await importar.POST(req("/excluidos/importar", "POST", { contactos: muchos, confirmar: false }))).status).toBe(400);
    expect((await importar.POST(req("/excluidos/importar", "POST", { contactos: [{ telefono: "1", nombre: null, foto: "x" }], confirmar: false }))).status).toBe(400);
    expect((await importar.POST(req("/excluidos/importar", "POST", { contactos: CONTACTOS }))).status).toBe(400);
    const enorme = JSON.stringify({ contactos: [{ telefono: "1", nombre: "x".repeat(800 * 1024) }], confirmar: false });
    expect((await importar.POST(req("/excluidos/importar", "POST", enorme))).status).toBe(413);
    m.consumir.mockResolvedValue(false);
    expect((await importar.POST(req("/excluidos/importar", "POST", { contactos: CONTACTOS, confirmar: false }))).status).toBe(429);
    expect(m.exclCreateMany).not.toHaveBeenCalled();
  });
});
