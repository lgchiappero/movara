import type { Prisma } from "@prisma/client";
import { claveEmail, claveTelefono } from "@/lib/clientes/normalizar";
import { calcularEstadoAutomatico, resolverEstado } from "@/lib/clientes/estado";
import type { OrigenClasificado } from "@/lib/origen-visita/clasificar";
import { ESTADO_PEDIDO_CANCELADO } from "@/lib/pedido/estado-pedido";
import { formatearFechaAR } from "@/lib/fecha-ar";

/** Alta o reutilización automática de Cliente y Lead (configurador,
 * pedido manual, contacto, dossier y agenda) y recálculo del estado del
 * cliente. Todo recibe una transacción: quien llama decide qué más va junto. */

type Tx = Prisma.TransactionClient;

/** Recalcula el estado automático del cliente y lo guarda si cambió (ver
 * resolverEstado para el caso manual). */
export async function recalcularEstadoCliente(tx: Tx, clienteId: string): Promise<void> {
  const cliente = await tx.cliente.findUnique({
    where: { id: clienteId },
    select: { estado: true, estadoManual: true, estadoAutomatico: true },
  });
  if (!cliente) return;

  const [pedidos, unidades, recibos] = await Promise.all([
    tx.configuracionPedido.findMany({
      where: { clienteId, estadoPedido: { not: ESTADO_PEDIDO_CANCELADO } },
      select: { estadoPedido: true },
    }),
    tx.unidad.count({ where: { clienteId } }),
    tx.reciboConformidad.count({ where: { estado: "confirmado", unidad: { clienteId } } }),
  ]);

  const automatico = calcularEstadoAutomatico({
    estadosPedido: pedidos.map((p) => p.estadoPedido),
    tieneUnidad: unidades > 0,
    tieneReciboConfirmado: recibos > 0,
  });
  const cambio = resolverEstado(cliente, automatico);
  if (cambio) await tx.cliente.update({ where: { id: clienteId }, data: cambio });
}

/** recalcularEstadoCliente para cada id distinto y no vacío. */
export async function recalcularClientes(tx: Tx, ids: (string | null | undefined)[]): Promise<void> {
  for (const id of new Set(ids.filter((v): v is string => !!v))) {
    await recalcularEstadoCliente(tx, id);
  }
}

/** Ejecuta fn dentro de un SAVEPOINT de la transacción: si falla, se deshace
 * solo lo que hizo fn y la transacción sigue viva para el resto. */
export async function conSavepoint<T>(tx: Tx, nombre: string, fn: () => Promise<T>): Promise<T> {
  await tx.$executeRawUnsafe(`SAVEPOINT ${nombre}`);
  try {
    const r = await fn();
    await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${nombre}`);
    return r;
  } catch (err) {
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${nombre}`);
    throw err;
  }
}

export type DatosContacto = {
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  dni?: string | null;
  tipoCliente?: string | null;
  razonSocial?: string | null;
  nombreContacto?: string | null;
  provincia?: string | null;
  localidad?: string | null;
};

export type ContextoContacto =
  | { tipo: "pedido"; pedidoId: string; numeroConsulta: string | null }
  | { tipo: "formulario"; nota: string; mensaje?: string | null };

export type ResultadoContacto = {
  clienteId: string;
  leadId: string;
  clienteNuevo: boolean;
  leadNuevo: boolean;
};

function vacio(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/** Solo los campos que el registro tiene vacíos y el contacto trae. */
function completarVacios<T extends Record<string, unknown>>(actual: T, nuevos: Partial<Record<keyof T, unknown>>) {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(nuevos)) {
    if (!vacio(v) && vacio(actual[k])) data[k] = v;
  }
  return data;
}

function fechaCorta(d: Date): string {
  return formatearFechaAR(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function agregarNota(notas: string | null, nota: string, ahora: Date = new Date()): string {
  const linea = `${fechaCorta(ahora)} — ${nota}`;
  return notas ? `${notas}\n\n${linea}` : linea;
}

/** Bloquea por email y teléfono hasta el fin de la transacción, para que dos
 * consultas simultáneas de la misma persona no creen dos clientes. */
async function bloquear(tx: Tx, claves: string[]): Promise<void> {
  for (const clave of [...claves].sort()) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`contacto:${clave}`}))::text`;
  }
}

/** Busca primero por email y después por teléfono; el más antiguo gana. */
async function buscarPorClaves<T>(
  buscar: (where: { emailNorm: string } | { telefonoNorm: string }) => Promise<T | null>,
  emailNorm: string | null,
  telefonoNorm: string | null
): Promise<T | null> {
  return (emailNorm ? await buscar({ emailNorm }) : null) ?? (telefonoNorm ? await buscar({ telefonoNorm }) : null);
}

function datosDeOrigen(origen: OrigenClasificado | null) {
  return origen ? { origenVisita: origen.origenVisita, campana: origen.campana, origenDetalle: origen.origenDetalle } : {};
}

/** Busca el cliente por email y después por teléfono; si existe completa
 * sus datos vacíos y si no lo crea. No recalcula el estado. */
export async function buscarOCrearCliente(
  tx: Tx,
  datos: DatosContacto,
  origen: OrigenClasificado | null = null
): Promise<{ id: string; nuevo: boolean }> {
  const emailNorm = claveEmail(datos.email);
  const telefonoNorm = claveTelefono(datos.telefono);
  await bloquear(tx, [emailNorm, telefonoNorm].filter((v): v is string => !!v));

  const datosCliente = {
    email: datos.email?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    dni: datos.dni || null,
    tipoCliente: datos.tipoCliente || null,
    razonSocial: datos.razonSocial || null,
    nombreContacto: datos.nombreContacto || null,
    provincia: datos.provincia || null,
    localidad: datos.localidad || null,
    emailNorm,
    telefonoNorm,
    ...datosDeOrigen(origen),
  };
  const existente = await buscarPorClaves(
    (where) => tx.cliente.findFirst({ where, orderBy: { createdAt: "asc" } }),
    emailNorm,
    telefonoNorm
  );
  if (existente) {
    const data = completarVacios(existente, datosCliente);
    if (Object.keys(data).length) await tx.cliente.update({ where: { id: existente.id }, data });
    return { id: existente.id, nuevo: false };
  }
  const nombre = [datos.nombre, datos.apellido].map((v) => v?.trim()).filter(Boolean).join(" ");
  return { id: (await tx.cliente.create({ data: { nombre, ...datosCliente } })).id, nuevo: true };
}

/** Crea o reutiliza el Cliente y el Lead de un contacto, los vincula entre
 * sí (lead.clienteId) y, si viene de un pedido, al pedido. Si ya existen,
 * solo completa los datos vacíos. Termina recalculando el estado del
 * cliente. */
export async function registrarContacto(
  tx: Tx,
  datos: DatosContacto,
  contexto: ContextoContacto,
  origen: OrigenClasificado | null = null,
  ahora: Date = new Date()
): Promise<ResultadoContacto> {
  const cliente = await buscarOCrearCliente(tx, datos, origen);
  const clienteId = cliente.id;
  const emailNorm = claveEmail(datos.email);
  const telefonoNorm = claveTelefono(datos.telefono);
  const email = datos.email?.trim() || null;
  const telefono = datos.telefono?.trim() || null;
  const datosOrigen = datosDeOrigen(origen);

  // ── Lead ─────────────────────────────────────────────────────────
  const lead = await buscarPorClaves(
    (where) => tx.lead.findFirst({ where, orderBy: { createdAt: "asc" } }),
    emailNorm,
    telefonoNorm
  );
  const datosLead = {
    email,
    dni: datos.dni || null,
    provincia: datos.provincia || null,
    clienteId,
    emailNorm,
    telefonoNorm,
    ...datosOrigen,
  };
  let leadId: string;
  if (lead) {
    leadId = lead.id;
    const data: Prisma.LeadUpdateInput = completarVacios(lead, { ...datosLead, telefono });
    if (contexto.tipo === "pedido") {
      const numero = contexto.numeroConsulta ?? contexto.pedidoId;
      if (lead.etapa === "perdido") {
        data.etapa = "nuevo";
        data.motivoPerdida = null;
        data.notasVenta = agregarNota(lead.notasVenta, `Volvió con el pedido ${numero}`, ahora);
      } else {
        data.notasVenta = agregarNota(lead.notasVenta, `Nuevo pedido ${numero}`, ahora);
      }
    } else if (contexto.tipo === "formulario") {
      const texto = contexto.mensaje?.trim() ? `${contexto.nota}: ${contexto.mensaje.trim()}` : contexto.nota;
      data.notasVenta = agregarNota(lead.notasVenta, texto, ahora);
      // Una consulta nueva vuelve a necesitar respuesta.
      data.contactado = false;
      data.contactadoEn = null;
    }
    if (Object.keys(data).length) await tx.lead.update({ where: { id: leadId }, data });
  } else {
    leadId = (
      await tx.lead.create({
        data: {
          nombre: datos.nombre.trim(),
          apellido: datos.apellido?.trim() || null,
          telefono: telefono ?? "",
          mensaje: contexto.tipo === "formulario" ? contexto.mensaje?.trim() || contexto.nota : null,
          notasVenta: agregarNota(
            null,
            contexto.tipo === "pedido" ? `Inició el pedido ${contexto.numeroConsulta ?? contexto.pedidoId}` : contexto.nota,
            ahora
          ),
          ...datosLead,
        },
      })
    ).id;
  }

  if (contexto.tipo === "pedido") {
    await tx.configuracionPedido.update({ where: { id: contexto.pedidoId }, data: { clienteId, leadId } });
  }
  await recalcularEstadoCliente(tx, clienteId);

  return { clienteId, leadId, clienteNuevo: cliente.nuevo, leadNuevo: !lead };
}
