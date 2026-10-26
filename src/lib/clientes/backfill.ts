import { claveEmail, claveTelefono } from "@/lib/clientes/normalizar";
import { calcularEstadoAutomatico, resolverEstado, type CambioEstado } from "@/lib/clientes/estado";
import { ESTADO_PEDIDO_CANCELADO } from "@/lib/pedido/estado-pedido";

/** Plan de una sola vez para los datos anteriores al alta automática: crea o
 * vincula Cliente y Lead para cada pedido y cada lead que no lo tenga, con
 * la misma deduplicación que registrarContacto (email y después teléfono),
 * completa emailNorm/telefonoNorm y calcula el estado de cada cliente.
 * Es una función pura: scripts/vincular-clientes.ts lee la base, la llama y,
 * con --aplicar, ejecuta el plan. Volver a correrlo da un plan vacío. */

export type ClienteBase = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  emailNorm: string | null;
  telefonoNorm: string | null;
  estado: string;
  estadoManual: boolean;
  estadoAutomatico: string;
  createdAt: Date;
};

export type LeadBase = {
  id: string;
  nombre: string;
  apellido: string | null;
  dni: string | null;
  email: string | null;
  telefono: string;
  provincia: string | null;
  etapa: string;
  clienteId: string | null;
  emailNorm: string | null;
  telefonoNorm: string | null;
  createdAt: Date;
};

export type PedidoBase = {
  id: string;
  numeroConsulta: string | null;
  clienteNombre: string;
  clienteEmail: string | null;
  clienteWhatsapp: string | null;
  tipoCliente: string | null;
  razonSocial: string | null;
  nombreContacto: string | null;
  provincia: string | null;
  localidad: string | null;
  estadoPedido: string;
  leadId: string | null;
  clienteId: string | null;
  createdAt: Date;
};

export type DatosBackfill = {
  clientes: ClienteBase[];
  leads: LeadBase[];
  pedidos: PedidoBase[];
  /** clienteId de cada unidad. */
  unidades: string[];
  /** clienteId de la unidad de cada recibo confirmado. */
  recibosConfirmados: string[];
};

export type ClienteNuevo = {
  ref: string;
  desde: string; // "pedido MOV-…" | "lead <id>"
  data: DatosClienteNuevo;
};

export type DatosClienteNuevo = {
  nombre: string;
  email: string | null;
  telefono: string | null;
  dni: string | null;
  tipoCliente: string | null;
  razonSocial: string | null;
  nombreContacto: string | null;
  provincia: string | null;
  localidad: string | null;
  emailNorm: string | null;
  telefonoNorm: string | null;
};

export type LeadNuevo = {
  ref: string;
  desde: string;
  clienteRef: string;
  nota: string;
  data: DatosLeadNuevo;
};

export type DatosLeadNuevo = {
  nombre: string;
  email: string | null;
  telefono: string;
  provincia: string | null;
  emailNorm: string | null;
  telefonoNorm: string | null;
};

/** Un id existente o la ref ("nuevo:N") de un cliente/lead del plan. */
export type PlanBackfill = {
  clientesNuevos: ClienteNuevo[];
  leadsNuevos: LeadNuevo[];
  pedidoCliente: { pedidoId: string; numero: string | null; clienteRef: string }[];
  pedidoLead: { pedidoId: string; numero: string | null; leadRef: string }[];
  leadCliente: { leadId: string; clienteRef: string }[];
  clavesCliente: { id: string; emailNorm: string | null; telefonoNorm: string | null }[];
  clavesLead: { id: string; emailNorm: string | null; telefonoNorm: string | null }[];
  estados: { clienteRef: string; cambio: CambioEstado }[];
  /** Leads perdidos sin pedido: quedan sin cliente. */
  perdidosSinCliente: number;
};

type Indice = { porEmail: Map<string, string>; porTelefono: Map<string, string> };

function nuevoIndice(): Indice {
  return { porEmail: new Map(), porTelefono: new Map() };
}

/** El primero que se agrega con una clave se queda con ella (el más antiguo). */
function indexar(ind: Indice, ref: string, emailNorm: string | null, telefonoNorm: string | null) {
  if (emailNorm && !ind.porEmail.has(emailNorm)) ind.porEmail.set(emailNorm, ref);
  if (telefonoNorm && !ind.porTelefono.has(telefonoNorm)) ind.porTelefono.set(telefonoNorm, ref);
}

function buscar(ind: Indice, emailNorm: string | null, telefonoNorm: string | null): string | null {
  return (emailNorm && ind.porEmail.get(emailNorm)) || (telefonoNorm && ind.porTelefono.get(telefonoNorm)) || null;
}

const porFecha = <T extends { createdAt: Date }>(a: T, b: T) => a.createdAt.getTime() - b.createdAt.getTime();

export function planificarBackfill(d: DatosBackfill): PlanBackfill {
  const plan: PlanBackfill = {
    clientesNuevos: [],
    leadsNuevos: [],
    pedidoCliente: [],
    pedidoLead: [],
    leadCliente: [],
    clavesCliente: [],
    clavesLead: [],
    estados: [],
    perdidosSinCliente: 0,
  };
  let siguiente = 0;
  const ref = () => `nuevo:${++siguiente}`;

  const clientes = [...d.clientes].sort(porFecha);
  const leads = [...d.leads].sort(porFecha);
  const pedidos = [...d.pedidos].sort(porFecha);

  // ── Claves de deduplicación de lo existente ─────────────────────────
  const indClientes = nuevoIndice();
  for (const c of clientes) {
    const emailNorm = claveEmail(c.email);
    const telefonoNorm = claveTelefono(c.telefono);
    if (emailNorm !== c.emailNorm || telefonoNorm !== c.telefonoNorm) {
      plan.clavesCliente.push({ id: c.id, emailNorm, telefonoNorm });
    }
    indexar(indClientes, c.id, emailNorm, telefonoNorm);
  }
  const indLeads = nuevoIndice();
  const clienteDeLead = new Map<string, string | null>();
  for (const l of leads) {
    const emailNorm = claveEmail(l.email);
    const telefonoNorm = claveTelefono(l.telefono);
    if (emailNorm !== l.emailNorm || telefonoNorm !== l.telefonoNorm) {
      plan.clavesLead.push({ id: l.id, emailNorm, telefonoNorm });
    }
    indexar(indLeads, l.id, emailNorm, telefonoNorm);
    clienteDeLead.set(l.id, l.clienteId);
  }

  const vincularLead = (leadRef: string, clienteRef: string) => {
    if (clienteDeLead.get(leadRef)) return;
    clienteDeLead.set(leadRef, clienteRef);
    if (!leadRef.startsWith("nuevo:")) plan.leadCliente.push({ leadId: leadRef, clienteRef });
  };

  // ── 1. Pedidos: cliente y lead ───────────────────────────────────────
  const estadosPorCliente = new Map<string, string[]>();
  for (const p of pedidos) {
    const emailNorm = claveEmail(p.clienteEmail);
    const telefonoNorm = claveTelefono(p.clienteWhatsapp);
    const numero = p.numeroConsulta;

    let clienteRef = p.clienteId ?? (p.leadId ? clienteDeLead.get(p.leadId) : null) ?? buscar(indClientes, emailNorm, telefonoNorm);
    if (!clienteRef) {
      clienteRef = ref();
      plan.clientesNuevos.push({
        ref: clienteRef,
        desde: `pedido ${numero ?? p.id}`,
        data: {
          nombre: p.clienteNombre,
          email: p.clienteEmail?.trim() || null,
          telefono: p.clienteWhatsapp?.trim() || null,
          dni: null,
          tipoCliente: p.tipoCliente,
          razonSocial: p.razonSocial,
          nombreContacto: p.nombreContacto,
          provincia: p.provincia,
          localidad: p.localidad,
          emailNorm,
          telefonoNorm,
        },
      });
    }
    indexar(indClientes, clienteRef, emailNorm, telefonoNorm);
    if (!p.clienteId) plan.pedidoCliente.push({ pedidoId: p.id, numero, clienteRef });

    let leadRef = p.leadId ?? buscar(indLeads, emailNorm, telefonoNorm);
    if (!leadRef) {
      leadRef = ref();
      plan.leadsNuevos.push({
        ref: leadRef,
        desde: `pedido ${numero ?? p.id}`,
        clienteRef,
        nota: `Inició el pedido ${numero ?? p.id} (vinculado al crear los clientes automáticos)`,
        data: {
          nombre: p.clienteNombre,
          email: p.clienteEmail?.trim() || null,
          telefono: p.clienteWhatsapp?.trim() ?? "",
          provincia: p.provincia,
          emailNorm,
          telefonoNorm,
        },
      });
      clienteDeLead.set(leadRef, clienteRef);
    }
    indexar(indLeads, leadRef, emailNorm, telefonoNorm);
    if (!p.leadId) plan.pedidoLead.push({ pedidoId: p.id, numero, leadRef });
    vincularLead(leadRef, clienteRef);

    if (p.estadoPedido !== ESTADO_PEDIDO_CANCELADO) {
      estadosPorCliente.set(clienteRef, [...(estadosPorCliente.get(clienteRef) ?? []), p.estadoPedido]);
    }
  }

  // ── 2. Leads sin cliente (sin pedido) ────────────────────────────────
  for (const l of leads) {
    if (clienteDeLead.get(l.id)) continue;
    if (l.etapa === "perdido") {
      plan.perdidosSinCliente++;
      continue;
    }
    const emailNorm = claveEmail(l.email);
    const telefonoNorm = claveTelefono(l.telefono);
    let clienteRef = buscar(indClientes, emailNorm, telefonoNorm);
    if (!clienteRef) {
      clienteRef = ref();
      plan.clientesNuevos.push({
        ref: clienteRef,
        desde: `lead ${l.id}`,
        data: {
          nombre: [l.nombre, l.apellido].map((v) => v?.trim()).filter(Boolean).join(" "),
          email: l.email?.trim() || null,
          telefono: l.telefono?.trim() || null,
          dni: l.dni,
          tipoCliente: null,
          razonSocial: null,
          nombreContacto: null,
          provincia: l.provincia,
          localidad: null,
          emailNorm,
          telefonoNorm,
        },
      });
    }
    indexar(indClientes, clienteRef, emailNorm, telefonoNorm);
    vincularLead(l.id, clienteRef);
  }

  // ── 3. Estado de cada cliente (existentes y nuevos) ─────────────────
  const unidades = new Set(d.unidades);
  const recibos = new Set(d.recibosConfirmados);
  const actuales = [
    ...clientes.map((c) => ({ ref: c.id, estado: c.estado, estadoManual: c.estadoManual, estadoAutomatico: c.estadoAutomatico })),
    ...plan.clientesNuevos.map((c) => ({ ref: c.ref, estado: "interesado", estadoManual: false, estadoAutomatico: "interesado" })),
  ];
  for (const c of actuales) {
    const automatico = calcularEstadoAutomatico({
      estadosPedido: estadosPorCliente.get(c.ref) ?? [],
      tieneUnidad: unidades.has(c.ref),
      tieneReciboConfirmado: recibos.has(c.ref),
    });
    const cambio = resolverEstado(c, automatico);
    if (cambio) plan.estados.push({ clienteRef: c.ref, cambio });
  }

  return plan;
}

/** Resumen para la corrida en seco. */
export function resumirPlan(plan: PlanBackfill) {
  const nuevos = new Set(plan.clientesNuevos.map((c) => c.ref));
  const aExistente = (r: { clienteRef: string }) => !nuevos.has(r.clienteRef);
  const estadoFinal = new Map<string, string>();
  for (const e of plan.estados) if (e.cambio.estado) estadoFinal.set(e.clienteRef, e.cambio.estado);
  const porEstado: Record<string, number> = {};
  for (const c of plan.clientesNuevos) {
    const est = estadoFinal.get(c.ref) ?? "interesado";
    porEstado[est] = (porEstado[est] ?? 0) + 1;
  }
  return {
    clientesNuevos: plan.clientesNuevos.length,
    clientesNuevosDesdePedidos: plan.clientesNuevos.filter((c) => c.desde.startsWith("pedido")).length,
    clientesNuevosDesdeLeads: plan.clientesNuevos.filter((c) => c.desde.startsWith("lead")).length,
    leadsNuevos: plan.leadsNuevos.length,
    pedidosVinculadosACliente: plan.pedidoCliente.length,
    pedidosVinculadosAClienteExistente: plan.pedidoCliente.filter(aExistente).length,
    pedidosVinculadosALead: plan.pedidoLead.length,
    pedidosVinculadosALeadExistente: plan.pedidoLead.filter((p) => !p.leadRef.startsWith("nuevo:")).length,
    leadsVinculadosACliente: plan.leadCliente.length,
    leadsVinculadosAClienteExistente: plan.leadCliente.filter(aExistente).length,
    perdidosSinCliente: plan.perdidosSinCliente,
    clavesClienteACompletar: plan.clavesCliente.length,
    clavesLeadACompletar: plan.clavesLead.length,
    estadosQueCambian: plan.estados.filter((e) => e.cambio.estado).length,
    clientesNuevosPorEstado: porEstado,
  };
}
