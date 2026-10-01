import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import PagosPanel from "@/components/admin/PagosPanel";
import { serializeAcuerdo } from "@/lib/cobranza/serialize";
import { conComprobantesFirmados } from "@/lib/cobranza/attach-signed-urls";
import type { UnidadOpcion } from "@/lib/cobranza/types";

export const dynamic = "force-dynamic";

/** Pagos a proveedores — dinero que sale. Misma lógica que Cobranza
 * (/admin/cobranza, dinero que entra del cliente), dirección opuesta. */
export default async function AdminPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vence?: string; moneda?: string }>;
}) {
  const sp = await searchParams;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Mismo barrido de auto-vencimiento que /admin/cobranza.
  await db.cuota.updateMany({
    where: { estado: "pendiente", vencimiento: { lt: hoy } },
    data: { estado: "vencido" },
  });

  const [session, acuerdosRaw, unidadesRaw] = await Promise.all([
    getAdminUser(),
    db.acuerdoPago.findMany({
      where: { tipo: "pago" },
      include: {
        unidad: {
          select: {
            numeroUnidad: true,
            modelo: true,
            estadoFabricacion: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
        cuotas: { orderBy: { vencimiento: "asc" } },
        movimientos: { orderBy: { fecha: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.unidad.findMany({
      select: { id: true, numeroUnidad: true, cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const acuerdos = await conComprobantesFirmados(acuerdosRaw.map(serializeAcuerdo));
  const unidades: UnidadOpcion[] = unidadesRaw.map((u) => ({
    id: u.id,
    numeroUnidad: u.numeroUnidad,
    clienteNombre: u.cliente.nombre,
  }));

  const estadoInicial = sp.vence === "semana" ? "semana" : sp.estado === "pagado" ? "saldado" : sp.estado;
  const monedaInicial = sp.moneda === "USD" || sp.moneda === "ARS" ? sp.moneda : undefined;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-6">
      <div>
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Panel MOVARA</p>
        <h1 className="text-2xl font-bold text-[#2F2F2F]">Pagos</h1>
      </div>
      <PagosPanel
        acuerdos={acuerdos}
        unidades={unidades}
        rol={session?.rol ?? "vendedor"}
        estadoInicial={estadoInicial}
        monedaInicial={monedaInicial}
      />
    </div>
  );
}
