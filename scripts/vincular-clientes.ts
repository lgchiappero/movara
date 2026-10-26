// Una sola vez: crea o vincula Cliente y Lead para los pedidos y leads que
// no lo tienen y calcula el estado de cada cliente (ver
// src/lib/clientes/backfill.ts). Por defecto es una corrida en seco que solo
// lee; escribe únicamente con --aplicar, todo en una transacción.
//
//   npx tsx scripts/vincular-clientes.ts            # en seco
//   npx tsx scripts/vincular-clientes.ts --aplicar  # aplica
//
// Las lecturas pasan por to_jsonb para que la corrida en seco funcione
// también antes de la migración 20261026120000 (columnas nuevas = null).
import "./_env";
import { db } from "@/lib/db";
import { agregarNota } from "@/lib/clientes/servicio";
import {
  planificarBackfill,
  resumirPlan,
  type ClienteBase,
  type LeadBase,
  type PedidoBase,
  type PlanBackfill,
} from "@/lib/clientes/backfill";

type Fila = Record<string, unknown>;

async function leer(sql: string): Promise<Fila[]> {
  const filas = await db.$queryRawUnsafe<{ j: Fila }[]>(sql);
  return filas.map((f) => f.j);
}

const texto = (v: unknown) => (typeof v === "string" ? v : null);
const fecha = (v: unknown) => new Date(String(v));

async function leerDatos() {
  const [clientes, leads, pedidos, unidades, recibos] = await Promise.all([
    leer(`SELECT to_jsonb(c) AS j FROM "clientes" c`),
    leer(`SELECT to_jsonb(l) AS j FROM "leads" l`),
    leer(`SELECT to_jsonb(p) - 'materiales' AS j FROM "configuraciones_pedido" p`),
    leer(`SELECT jsonb_build_object('clienteId', u."clienteId") AS j FROM "unidades" u`),
    leer(`SELECT jsonb_build_object('clienteId', u."clienteId") AS j
            FROM "recibos_conformidad" r JOIN "unidades" u ON u.id = r."unidadId"
           WHERE r.estado = 'confirmado'`),
  ]);
  return {
    clientes: clientes.map(
      (c): ClienteBase => ({
        id: String(c.id),
        nombre: String(c.nombre),
        email: texto(c.email),
        telefono: texto(c.telefono),
        emailNorm: texto(c.emailNorm),
        telefonoNorm: texto(c.telefonoNorm),
        estado: texto(c.estado) ?? "interesado",
        estadoManual: c.estadoManual === true,
        estadoAutomatico: texto(c.estadoAutomatico) ?? "interesado",
        createdAt: fecha(c.createdAt),
      })
    ),
    leads: leads.map(
      (l): LeadBase => ({
        id: String(l.id),
        nombre: String(l.nombre),
        apellido: texto(l.apellido),
        dni: texto(l.dni),
        email: texto(l.email),
        telefono: texto(l.telefono) ?? "",
        provincia: texto(l.provincia),
        etapa: texto(l.etapa) ?? "nuevo",
        clienteId: texto(l.clienteId),
        emailNorm: texto(l.emailNorm),
        telefonoNorm: texto(l.telefonoNorm),
        createdAt: fecha(l.createdAt),
      })
    ),
    pedidos: pedidos.map(
      (p): PedidoBase => ({
        id: String(p.id),
        numeroConsulta: texto(p.numeroConsulta),
        clienteNombre: String(p.clienteNombre),
        clienteEmail: texto(p.clienteEmail),
        clienteWhatsapp: texto(p.clienteWhatsapp),
        tipoCliente: texto(p.tipoCliente),
        razonSocial: texto(p.razonSocial),
        nombreContacto: texto(p.nombreContacto),
        provincia: texto(p.provincia),
        localidad: texto(p.localidad),
        estadoPedido: texto(p.estadoPedido) ?? "consulta",
        leadId: texto(p.leadId),
        clienteId: texto(p.clienteId),
        createdAt: fecha(p.createdAt),
      })
    ),
    unidades: unidades.map((u) => String(u.clienteId)),
    recibosConfirmados: recibos.map((r) => String(r.clienteId)),
  };
}

/** Enmascara email y teléfono para mostrar la muestra en la terminal. */
function enmascarar(v: string | null): string {
  if (!v) return "—";
  if (v.includes("@")) {
    const [u, dom] = v.split("@");
    return `${u.slice(0, 2)}…@${dom}`;
  }
  return `…${v.replace(/\D/g, "").slice(-4)}`;
}

function mostrar(plan: PlanBackfill) {
  console.log("\nResumen:");
  console.table(
    Object.fromEntries(Object.entries(resumirPlan(plan)).filter(([, v]) => typeof v === "number"))
  );
  console.log("Clientes nuevos por estado:", resumirPlan(plan).clientesNuevosPorEstado);

  const estado = new Map(plan.estados.map((e) => [e.clienteRef, e.cambio.estado]));
  console.log("\nMuestra de clientes nuevos (10):");
  console.table(
    plan.clientesNuevos.slice(0, 10).map((c) => ({
      desde: c.desde,
      nombre: c.data.nombre,
      email: enmascarar(c.data.email),
      telefono: enmascarar(c.data.telefono),
      provincia: c.data.provincia ?? "—",
      estado: estado.get(c.ref) ?? "interesado",
    }))
  );
  console.log("\nMuestra de pedidos vinculados (10):");
  const nombres = new Map(plan.clientesNuevos.map((c) => [c.ref, `${c.data.nombre} (nuevo)`]));
  console.table(
    plan.pedidoCliente.slice(0, 10).map((p) => ({
      pedido: p.numero ?? p.pedidoId,
      cliente: nombres.get(p.clienteRef) ?? `existente ${p.clienteRef}`,
      lead: plan.pedidoLead.find((l) => l.pedidoId === p.pedidoId)?.leadRef.startsWith("nuevo:") ? "nuevo" : "existente",
    }))
  );
}

async function aplicar(plan: PlanBackfill) {
  const ahora = new Date();
  await db.$transaction(
    async (tx) => {
      const ids = new Map<string, string>();
      const id = (r: string) => ids.get(r) ?? r;

      for (const c of plan.clientesNuevos) {
        ids.set(c.ref, (await tx.cliente.create({ data: c.data, select: { id: true } })).id);
      }
      for (const l of plan.leadsNuevos) {
        const creado = await tx.lead.create({
          data: { ...l.data, clienteId: id(l.clienteRef), notasVenta: agregarNota(null, l.nota, ahora) },
          select: { id: true },
        });
        ids.set(l.ref, creado.id);
      }
      for (const p of plan.pedidoCliente) {
        await tx.configuracionPedido.update({ where: { id: p.pedidoId }, data: { clienteId: id(p.clienteRef) } });
      }
      for (const p of plan.pedidoLead) {
        await tx.configuracionPedido.update({ where: { id: p.pedidoId }, data: { leadId: id(p.leadRef) } });
      }
      for (const l of plan.leadCliente) {
        await tx.lead.update({ where: { id: l.leadId }, data: { clienteId: id(l.clienteRef) } });
      }
      for (const { id: cid, ...claves } of plan.clavesCliente) {
        await tx.cliente.update({ where: { id: cid }, data: claves });
      }
      for (const { id: lid, ...claves } of plan.clavesLead) {
        await tx.lead.update({ where: { id: lid }, data: claves });
      }
      for (const e of plan.estados) {
        await tx.cliente.update({ where: { id: id(e.clienteRef) }, data: e.cambio });
      }
    },
    { timeout: 120_000, maxWait: 10_000 }
  );
}

async function main(): Promise<number> {
  const aplicarCambios = process.argv.includes("--aplicar");
  let host = "";
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    host = "(DATABASE_URL inválida)";
  }
  console.log(`[vincular-clientes] Base: ${host} — ${aplicarCambios ? "APLICANDO" : "corrida en seco (no escribe nada)"}`);

  const datos = await leerDatos();
  console.log(
    `Leídos: ${datos.clientes.length} clientes, ${datos.leads.length} leads, ${datos.pedidos.length} pedidos, ` +
      `${datos.unidades.length} unidades, ${datos.recibosConfirmados.length} recibos confirmados`
  );
  const plan = planificarBackfill(datos);
  mostrar(plan);

  if (!aplicarCambios) {
    console.log("\nCorrida en seco: no se escribió nada. Para aplicar: --aplicar");
    return 0;
  }
  await aplicar(plan);
  const despues = planificarBackfill(await leerDatos());
  // Los perdidos sin pedido quedan sin cliente a propósito: no cuentan.
  const resumen: Record<string, unknown> = resumirPlan(despues);
  const pendiente = Object.entries(resumen).some(
    ([k, v]) => k !== "perdidosSinCliente" && typeof v === "number" && v > 0
  );
  console.log(`\nAplicado. Plan al volver a leer: ${pendiente ? "QUEDAN CAMBIOS (revisar)" : "vacío ✓"}`);
  return pendiente ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("[vincular-clientes] Error:", err);
    process.exit(1);
  });
