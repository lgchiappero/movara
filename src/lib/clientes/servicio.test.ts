import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  registrarContacto,
  buscarOCrearCliente,
  recalcularEstadoCliente,
  recalcularClientes,
  conSavepoint,
  agregarNota,
} from "@/lib/clientes/servicio";
import type { OrigenClasificado } from "@/lib/origen-visita/clasificar";

type Fila = Record<string, unknown> & { id: string; createdAt: Date };

/** Base en memoria con lo que usa el servicio. */
function crearBase() {
  let n = 0;
  const tablas = {
    clientes: [] as Fila[],
    leads: [] as Fila[],
    pedidos: [] as Fila[],
    unidades: [] as Fila[],
    recibos: [] as Fila[],
  };
  const coincide = (f: Fila, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === "object" && "not" in v) return f[k] !== (v as { not: unknown }).not;
      return f[k] === v;
    });
  const tabla = (filas: Fila[], defaults: Record<string, unknown> = {}) => ({
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => filas.find((f) => f.id === where.id) ?? null),
    findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      [...filas].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).find((f) => coincide(f, where)) ?? null
    ),
    findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => filas.filter((f) => coincide(f, where))),
    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => filas.filter((f) => coincide(f, where)).length),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const fila = { ...defaults, ...data, id: `id${++n}`, createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, n)) } as Fila;
      filas.push(fila);
      return fila;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const fila = filas.find((f) => f.id === where.id)!;
      Object.assign(fila, data);
      return fila;
    }),
  });
  const tx = {
    cliente: tabla(tablas.clientes, { estado: "interesado", estadoManual: false, estadoAutomatico: "interesado" }),
    lead: tabla(tablas.leads, { etapa: "nuevo", notasVenta: null, contactado: false }),
    configuracionPedido: tabla(tablas.pedidos, { estadoPedido: "consulta" }),
    unidad: tabla(tablas.unidades),
    reciboConformidad: {
      count: vi.fn(
        async ({ where }: { where: { estado: string; unidad: { clienteId: string } } }) =>
          tablas.recibos.filter(
            (r) =>
              r.estado === where.estado &&
              tablas.unidades.some((u) => u.id === r.unidadId && u.clienteId === where.unidad.clienteId)
          ).length
      ),
    },
    $executeRawUnsafe: vi.fn(async (sql: string) => sql.length),
    $queryRaw: vi.fn(async () => []),
  };
  return { tablas, tx, txPrisma: tx as unknown as Prisma.TransactionClient };
}

let base: ReturnType<typeof crearBase>;
beforeEach(() => {
  base = crearBase();
});

const AHORA = new Date("2026-10-26T15:00:00.000Z");
const ANA = { nombre: "Ana García", email: "Ana@Example.com", telefono: "+54 9 11 1234-5678" };

async function nuevoPedido(estadoPedido = "consulta") {
  return base.tx.configuracionPedido.create({ data: { estadoPedido } });
}

describe("registrarContacto — pedido", () => {
  it("pedido nuevo → cliente 'pedido iniciado' + lead, vinculados al pedido", async () => {
    const p = await nuevoPedido();
    const origen: OrigenClasificado = { origenVisita: "meta_ads", campana: "otono", origenDetalle: { utm_source: "facebook" } };
    const r = await registrarContacto(
      base.txPrisma,
      { ...ANA, provincia: "Santa Fe", localidad: "Rafaela", tipoCliente: "particular" },
      { tipo: "pedido", pedidoId: p.id, numeroConsulta: "MOV-CONSULTA-2026-001" },
      origen,
      AHORA
    );
    expect(r).toMatchObject({ clienteNuevo: true, leadNuevo: true });

    const [cliente] = base.tablas.clientes;
    expect(cliente).toMatchObject({
      nombre: "Ana García",
      email: "Ana@Example.com",
      emailNorm: "ana@example.com",
      telefonoNorm: "1112345678",
      provincia: "Santa Fe",
      localidad: "Rafaela",
      estado: "pedido_iniciado",
      origenVisita: "meta_ads",
      campana: "otono",
    });
    const [lead] = base.tablas.leads;
    expect(lead).toMatchObject({ clienteId: cliente.id, telefono: "+54 9 11 1234-5678", mensaje: null, origenVisita: "meta_ads" });
    expect(lead.notasVenta).toBe("26/10/2026 — Inició el pedido MOV-CONSULTA-2026-001");
    expect(base.tablas.pedidos[0]).toMatchObject({ clienteId: cliente.id, leadId: lead.id });
    // Bloquea por email y teléfono antes de buscar.
    expect(base.tx.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("segundo pedido del mismo email → mismo cliente y mismo lead", async () => {
    const p1 = await nuevoPedido();
    const r1 = await registrarContacto(base.txPrisma, ANA, { tipo: "pedido", pedidoId: p1.id, numeroConsulta: "N1" }, null, AHORA);
    const p2 = await nuevoPedido();
    const r2 = await registrarContacto(
      base.txPrisma,
      { ...ANA, email: "ana@example.com ", telefono: "011 15 9999-0000" },
      { tipo: "pedido", pedidoId: p2.id, numeroConsulta: "N2" },
      null,
      AHORA
    );
    expect(r2).toEqual({ clienteId: r1.clienteId, leadId: r1.leadId, clienteNuevo: false, leadNuevo: false });
    expect(base.tablas.clientes).toHaveLength(1);
    expect(base.tablas.leads).toHaveLength(1);
    expect(base.tablas.leads[0].notasVenta).toBe("26/10/2026 — Inició el pedido N1\n\n26/10/2026 — Nuevo pedido N2");
    expect(base.tablas.pedidos[1]).toMatchObject({ clienteId: r1.clienteId, leadId: r1.leadId });
  });

  it("sin email, reutiliza por teléfono normalizado y completa solo los datos vacíos", async () => {
    await base.tx.cliente.create({
      data: { nombre: "Ana", email: null, telefono: "11 1234 5678", provincia: "Córdoba", emailNorm: null, telefonoNorm: "1112345678" },
    });
    const p = await nuevoPedido();
    await registrarContacto(
      base.txPrisma,
      { ...ANA, provincia: "Santa Fe", localidad: "Rafaela" },
      { tipo: "pedido", pedidoId: p.id, numeroConsulta: "N1" },
      null,
      AHORA
    );
    expect(base.tablas.clientes).toHaveLength(1);
    // Completa email y localidad; no pisa nombre, teléfono ni provincia.
    expect(base.tablas.clientes[0]).toMatchObject({
      nombre: "Ana",
      telefono: "11 1234 5678",
      provincia: "Córdoba",
      email: "Ana@Example.com",
      emailNorm: "ana@example.com",
      localidad: "Rafaela",
    });
  });

  it("lead perdido que vuelve con un pedido: pasa a 'nuevo' con una nota", async () => {
    await base.tx.lead.create({
      data: { nombre: "Ana", telefono: "1", emailNorm: "ana@example.com", etapa: "perdido", motivoPerdida: "precio", notasVenta: "Llamar en marzo" },
    });
    const p = await nuevoPedido();
    await registrarContacto(base.txPrisma, ANA, { tipo: "pedido", pedidoId: p.id, numeroConsulta: "MOV-CONSULTA-2026-009" }, null, AHORA);
    expect(base.tablas.leads).toHaveLength(1);
    expect(base.tablas.leads[0]).toMatchObject({
      etapa: "nuevo",
      motivoPerdida: null,
      notasVenta: "Llamar en marzo\n\n26/10/2026 — Volvió con el pedido MOV-CONSULTA-2026-009",
    });
  });

  it("sin número de consulta usa el id del pedido en la nota", async () => {
    const p = await nuevoPedido();
    await registrarContacto(base.txPrisma, ANA, { tipo: "pedido", pedidoId: p.id, numeroConsulta: null }, null, AHORA);
    expect(base.tablas.leads[0].notasVenta).toContain(`Inició el pedido ${p.id}`);
  });
});

describe("registrarContacto — formularios", () => {
  it("contacto nuevo → cliente 'interesado' y lead con el mensaje", async () => {
    await registrarContacto(
      base.txPrisma,
      { nombre: "Juan", apellido: "Pérez", telefono: "3492 15 123456", dni: "30111222" },
      { tipo: "formulario", nota: "Consulta desde el formulario de contacto", mensaje: " Quiero info " },
      null,
      AHORA
    );
    expect(base.tablas.clientes[0]).toMatchObject({ nombre: "Juan Pérez", estado: "interesado", dni: "30111222", email: null });
    expect(base.tablas.leads[0]).toMatchObject({
      nombre: "Juan",
      apellido: "Pérez",
      mensaje: "Quiero info",
      notasVenta: "26/10/2026 — Consulta desde el formulario de contacto",
    });
  });

  it("sin mensaje, el lead nuevo guarda la nota como mensaje", async () => {
    await registrarContacto(base.txPrisma, { nombre: "Juan", email: "j@x.com" }, { tipo: "formulario", nota: "Pidió el dossier" }, null, AHORA);
    expect(base.tablas.leads[0]).toMatchObject({ mensaje: "Pidió el dossier", telefono: "" });
  });

  it("lead existente: suma el mensaje a sus notas y vuelve a 'sin contactar', sin crear otro", async () => {
    await base.tx.lead.create({
      data: { nombre: "Ana", telefono: "1", emailNorm: "ana@example.com", contactado: true, contactadoEn: new Date(), notasVenta: null, etapa: "perdido" },
    });
    await registrarContacto(base.txPrisma, ANA, { tipo: "formulario", nota: "Pidió el dossier", mensaje: "¿Precio del 40?" }, null, AHORA);
    await registrarContacto(base.txPrisma, ANA, { tipo: "formulario", nota: "Agendó visita" }, null, AHORA);
    expect(base.tablas.leads).toHaveLength(1);
    expect(base.tablas.leads[0]).toMatchObject({
      contactado: false,
      contactadoEn: null,
      // Un formulario no reabre un lead perdido.
      etapa: "perdido",
      notasVenta: "26/10/2026 — Pidió el dossier: ¿Precio del 40?\n\n26/10/2026 — Agendó visita",
    });
  });

  it("el origen se guarda la primera vez y no se pisa", async () => {
    const meta: OrigenClasificado = { origenVisita: "meta_ads", campana: "a", origenDetalle: {} };
    const google: OrigenClasificado = { origenVisita: "google", campana: null, origenDetalle: {} };
    await registrarContacto(base.txPrisma, ANA, { tipo: "formulario", nota: "x" }, meta, AHORA);
    await registrarContacto(base.txPrisma, ANA, { tipo: "formulario", nota: "y" }, google, AHORA);
    expect(base.tablas.clientes[0]).toMatchObject({ origenVisita: "meta_ads", campana: "a" });
    expect(base.tablas.leads[0]).toMatchObject({ origenVisita: "meta_ads" });
  });

  it("sin email ni teléfono válidos no bloquea ni deduplica", async () => {
    await registrarContacto(base.txPrisma, { nombre: "X", telefono: "12" }, { tipo: "formulario", nota: "n" }, null, AHORA);
    await registrarContacto(base.txPrisma, { nombre: "X", telefono: "12" }, { tipo: "formulario", nota: "n" }, null, AHORA);
    expect(base.tx.$queryRaw).not.toHaveBeenCalled();
    expect(base.tablas.clientes).toHaveLength(2);
  });
});

describe("buscarOCrearCliente", () => {
  it("existente sin datos nuevos: no actualiza", async () => {
    await base.tx.cliente.create({ data: { nombre: "Ana", email: "ana@example.com", emailNorm: "ana@example.com", telefonoNorm: null } });
    const r = await buscarOCrearCliente(base.txPrisma, { nombre: "Otra", email: "ana@example.com" });
    expect(r.nuevo).toBe(false);
    expect(base.tx.cliente.update).not.toHaveBeenCalled();
  });
});

describe("recalcularEstadoCliente", () => {
  async function cliente(data: Record<string, unknown> = {}) {
    return base.tx.cliente.create({ data: { nombre: "Ana", ...data } });
  }

  it("pedido confirmado → comprador; los cancelados no cuentan", async () => {
    const c = await cliente();
    await base.tx.configuracionPedido.create({ data: { clienteId: c.id, estadoPedido: "confirmado" } });
    await recalcularEstadoCliente(base.txPrisma, c.id);
    expect(base.tablas.clientes[0].estado).toBe("comprador");

    base.tablas.pedidos[0].estadoPedido = "cancelado";
    await recalcularEstadoCliente(base.txPrisma, c.id);
    expect(base.tablas.clientes[0].estado).toBe("interesado");
  });

  it("una unidad → comprador; un recibo confirmado → entregado", async () => {
    const c = await cliente();
    const u = await base.tx.unidad.create({ data: { clienteId: c.id } });
    await recalcularEstadoCliente(base.txPrisma, c.id);
    expect(base.tablas.clientes[0].estado).toBe("comprador");
    base.tablas.recibos.push({ id: "r1", createdAt: new Date(), unidadId: u.id, estado: "confirmado" });
    await recalcularEstadoCliente(base.txPrisma, c.id);
    expect(base.tablas.clientes[0].estado).toBe("entregado");
  });

  it("cambio manual: se mantiene hasta que un avance lo supera", async () => {
    const c = await cliente({ estado: "presupuestado", estadoManual: true, estadoAutomatico: "pedido_iniciado", estadoManualPor: "a@x.com" });
    await base.tx.configuracionPedido.create({ data: { clienteId: c.id, estadoPedido: "consulta" } });
    await recalcularEstadoCliente(base.txPrisma, c.id);
    expect(base.tablas.clientes[0]).toMatchObject({ estado: "presupuestado", estadoManual: true });

    base.tablas.pedidos[0].estadoPedido = "confirmado";
    await recalcularEstadoCliente(base.txPrisma, c.id);
    expect(base.tablas.clientes[0]).toMatchObject({ estado: "comprador", estadoManual: false, estadoManualPor: null });
  });

  it("sin cambios no escribe; cliente inexistente no hace nada", async () => {
    const c = await cliente();
    await recalcularEstadoCliente(base.txPrisma, c.id);
    await recalcularEstadoCliente(base.txPrisma, "no-existe");
    expect(base.tx.cliente.update).not.toHaveBeenCalled();
  });

  it("recalcularClientes: cada id una vez, sin vacíos", async () => {
    const c = await cliente();
    await recalcularClientes(base.txPrisma, [c.id, null, undefined, c.id, ""]);
    expect(base.tx.cliente.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("conSavepoint", () => {
  it("libera el savepoint si todo sale bien", async () => {
    expect(await conSavepoint(base.txPrisma, "sp", async () => 42)).toBe(42);
    expect(base.tx.$executeRawUnsafe.mock.calls.map((c) => c[0])).toEqual(["SAVEPOINT sp", "RELEASE SAVEPOINT sp"]);
  });

  it("si falla vuelve al savepoint y relanza el error", async () => {
    await expect(conSavepoint(base.txPrisma, "sp", async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(base.tx.$executeRawUnsafe.mock.calls.map((c) => c[0])).toEqual(["SAVEPOINT sp", "ROLLBACK TO SAVEPOINT sp"]);
  });
});

describe("agregarNota", () => {
  it("agrega una línea con fecha al final", () => {
    expect(agregarNota(null, "Hola", AHORA)).toBe("26/10/2026 — Hola");
    expect(agregarNota("Antes", "Hola", AHORA)).toBe("Antes\n\n26/10/2026 — Hola");
    expect(agregarNota("", "Hola")).toMatch(/^\d{2}\/\d{2}\/\d{4} — Hola$/);
  });
});
