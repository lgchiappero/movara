import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";
import ClienteDetailForm from "@/components/admin/ClienteDetailForm";
import EliminarClienteButton from "@/components/admin/EliminarClienteButton";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import RecibosClienteSection from "@/components/admin/recibos/RecibosClienteSection";
import EstadoClienteSelector from "@/components/admin/EstadoClienteSelector";
import OrigenVisitaChip from "@/components/admin/OrigenVisitaChip";
import { etiquetaEstadoPedido } from "@/lib/pedido/estado-pedido";
import { ETAPA_LABELS, type Etapa } from "@/lib/leads/constantes";
import { formatearFechaAR, formatearSoloFecha } from "@/lib/fecha-ar";

const tarjeta = "bg-white rounded-2xl border border-[#E5E5E5] p-5";
const tituloTarjeta = "text-sm font-bold uppercase tracking-widest text-sage-600 mb-4";
const fila =
  "flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0] hover:bg-stone-50 transition-colors";
const fecha = (d: Date) => formatearFechaAR(d);

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await db.cliente.findUnique({
    where: { id },
    include: {
      unidades: {
        orderBy: { createdAt: "desc" },
        include: {
          envio: { select: { numeroPI: true } },
          recibos: {
            orderBy: { createdAt: "desc" },
            select: { id: true, numeroRecibo: true, numeroUnidad: true, unidadId: true, modelo: true, estado: true, confirmadoAt: true },
          },
        },
      },
      pedidos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, numeroConsulta: true, numeroPedido: true, modelo: true, estadoPedido: true, createdAt: true },
      },
    },
  });

  if (!cliente) notFound();

  // Consultas: los leads del cliente y las visitas agendadas con su email.
  const [session, leads, citas] = await Promise.all([
    getAdminUser(),
    db.lead.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, etapa: true, mensaje: true, createdAt: true },
    }),
    cliente.email
      ? db.cita.findMany({
          where: { email: { equals: cliente.email, mode: "insensitive" } },
          orderBy: { fecha: "desc" },
          select: { id: true, fecha: true, horario: true, estado: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <Link href="/admin/clientes" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a la lista
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
            Panel MOVARA
          </p>
          <h1 className="text-2xl font-bold text-[#2F2F2F]">{cliente.nombre}</h1>
        </div>
        {session && isAdmin(session.rol) && (
          <EliminarClienteButton id={id} cantidadUnidades={cliente.unidades.length} />
        )}
      </div>

      <EstadoClienteSelector
        id={id}
        estado={cliente.estado}
        estadoManual={cliente.estadoManual}
        estadoManualEn={cliente.estadoManualEn?.toISOString() ?? null}
        estadoManualPor={cliente.estadoManualPor}
        estadoAutomatico={cliente.estadoAutomatico}
      />

      {cliente.origenVisita && (
        <div className={`${tarjeta} flex items-center gap-3 text-sm`}>
          <span className="text-stone-500">Origen web:</span>
          <OrigenVisitaChip origenVisita={cliente.origenVisita} campana={cliente.campana} />
        </div>
      )}

      <ClienteDetailForm
        id={id}
        initial={{
          nombre: cliente.nombre,
          dni: cliente.dni,
          cuit: cliente.cuit,
          domicilio: cliente.domicilio,
          email: cliente.email,
          telefono: cliente.telefono,
          notas: cliente.notas,
          razonSocial: cliente.razonSocial,
          nombreContacto: cliente.nombreContacto,
          provincia: cliente.provincia,
          localidad: cliente.localidad,
        }}
      />

      <div className={tarjeta}>
        <h2 className={tituloTarjeta}>Pedidos ({cliente.pedidos.length})</h2>
        {cliente.pedidos.length === 0 ? (
          <p className="text-sm text-stone-400">Este cliente todavía no tiene pedidos.</p>
        ) : (
          <div className="space-y-1.5">
            {cliente.pedidos.map((p) => (
              <Link key={p.id} href={`/admin/configuraciones/${p.id}`} className={fila}>
                <div>
                  <span className="font-medium text-[#2F2F2F]">{p.numeroPedido ?? p.numeroConsulta ?? "Sin número"}</span>
                  <span className="text-stone-400 ml-2">{p.modelo ?? "Modelo sin definir"}</span>
                  <span className="text-stone-400 ml-2">· {fecha(p.createdAt)}</span>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                  {etiquetaEstadoPedido(p.estadoPedido)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={tarjeta}>
        <h2 className={tituloTarjeta}>Consultas ({leads.length + citas.length})</h2>
        {leads.length + citas.length === 0 ? (
          <p className="text-sm text-stone-400">Sin consultas registradas.</p>
        ) : (
          <div className="space-y-1.5">
            {leads.map((l) => (
              <Link key={l.id} href={`/admin/pipeline?leadId=${l.id}`} className={fila}>
                <div className="min-w-0">
                  <span className="font-medium text-[#2F2F2F]">Lead · {fecha(l.createdAt)}</span>
                  {l.mensaje && <span className="text-stone-400 ml-2 truncate">{l.mensaje.slice(0, 80)}</span>}
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 whitespace-nowrap">
                  {ETAPA_LABELS[l.etapa as Etapa] ?? l.etapa}
                </span>
              </Link>
            ))}
            {citas.map((c) => (
              <div key={c.id} className={fila}>
                <span className="font-medium text-[#2F2F2F]">
                  Visita al showroom · {formatearSoloFecha(c.fecha)} {c.horario}hs
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">{c.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
          Unidades ({cliente.unidades.length})
        </h2>
        {cliente.unidades.length === 0 ? (
          <p className="text-sm text-stone-400">Este cliente todavía no tiene unidades cargadas.</p>
        ) : (
          <div className="space-y-1.5">
            {cliente.unidades.map((u) => (
              <Link
                key={u.id}
                href={`/admin/unidades/${u.id}`}
                className="flex items-center justify-between gap-3 text-sm py-2 px-3 rounded-lg border border-[#F0F0F0] hover:bg-stone-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-[#2F2F2F]">{u.numeroUnidad ?? "Sin número"}</span>
                  <span className="text-stone-400 ml-2">{u.modelo ?? "Modelo sin definir"}</span>
                  {u.envio?.numeroPI && <span className="text-stone-400 ml-2">· PI {u.envio.numeroPI}</span>}
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                  {estadoFabricacionLabels[u.estadoFabricacion as EstadoFabricacion] ?? u.estadoFabricacion}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <RecibosClienteSection recibos={cliente.unidades.flatMap((u) => u.recibos)} />
    </div>
  );
}