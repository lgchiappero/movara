import { db } from "@/lib/db";
import CobranzaPanel, { type UnidadOpcion } from "@/components/admin/CobranzaPanel";
import { serializeAcuerdo } from "@/lib/cobranza/serialize";

export const dynamic = "force-dynamic";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function AdminCobranzaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const hoy = startOfDay(now);
  const inicioMes = startOfMonth(now);

  // Auto-vencimiento: al entrar a esta página, cualquier cuota "pendiente"
  // con vencimiento ya pasado se marca "vencida" — barrido global, no
  // limitado a lo que se muestra en esta carga.
  await db.cuota.updateMany({
    where: { estado: "pendiente", vencimiento: { lt: hoy } },
    data: { estado: "vencido" },
  });

  const include = {
    unidad: { select: { numeroUnidad: true, cliente: { select: { nombre: true } } } },
    cuotas: { orderBy: { vencimiento: "asc" as const } },
    movimientos: { orderBy: { fecha: "desc" as const } },
  };

  const [acuerdosCobroRaw, acuerdosPagoRaw, unidadesRaw, cobradoMesAgg, pagadoMesAgg, cuotasVencidas] =
    await Promise.all([
      db.acuerdoPago.findMany({ where: { tipo: "cobro" }, include, orderBy: { createdAt: "desc" } }),
      db.acuerdoPago.findMany({ where: { tipo: "pago" }, include, orderBy: { createdAt: "desc" } }),
      db.unidad.findMany({
        select: { id: true, numeroUnidad: true, cliente: { select: { nombre: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.movimiento.aggregate({
        _sum: { importe: true },
        where: { fecha: { gte: inicioMes }, acuerdo: { tipo: "cobro", moneda: "USD" } },
      }),
      db.movimiento.aggregate({
        _sum: { importe: true },
        where: { fecha: { gte: inicioMes }, acuerdo: { tipo: "pago", moneda: "USD" } },
      }),
      db.cuota.count({ where: { estado: "vencido" } }),
    ]);

  const acuerdosCobro = acuerdosCobroRaw.map(serializeAcuerdo);
  const acuerdosPago = acuerdosPagoRaw.map(serializeAcuerdo);

  const cobradoMes = cobradoMesAgg._sum.importe ?? 0;
  const pagadoMes = pagadoMesAgg._sum.importe ?? 0;

  const unidades: UnidadOpcion[] = unidadesRaw.map((u) => ({
    id: u.id,
    numeroUnidad: u.numeroUnidad,
    clienteNombre: u.cliente.nombre,
  }));

  const tabInicial = sp.tipo === "pago" ? "pagos" : sp.tipo === "cobro" ? "cobros" : undefined;
  const estadoInicial = sp.estado === "vencido" ? "vencido" : undefined;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Cobranza</h1>
      </div>

      <CobranzaPanel
        acuerdosCobro={acuerdosCobro}
        acuerdosPago={acuerdosPago}
        unidades={unidades}
        metricas={{
          cobradoMes,
          pagadoMes,
          margenMes: cobradoMes - pagadoMes,
          cuotasVencidas,
        }}
        tabInicial={tabInicial}
        estadoInicial={estadoInicial}
      />
    </div>
  );
}
