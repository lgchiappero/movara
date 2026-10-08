import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { datosTexto, verificarHash } from "@/lib/recibos/servicio";
import { construirTextoRecibo, fechaFinGarantia, fechaHoraAR, fechaLargaUTC, textoPlano } from "@/lib/recibos/texto";
import EstadoReciboChip from "@/components/admin/recibos/EstadoReciboChip";
import ReciboAcciones from "@/components/admin/recibos/ReciboAcciones";

export const dynamic = "force-dynamic";

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-stone-500 shrink-0">{label}</dt>
      <dd className="text-[#2F2F2F] font-medium text-right break-all">{children}</dd>
    </div>
  );
}

const card = "bg-white rounded-2xl border border-[#E5E5E5] p-5";
const tituloCard = "text-sm font-bold uppercase tracking-widest text-sage-600 mb-3";

export default async function ReciboDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { id } = await params;
  const { email } = await searchParams;
  const recibo = await db.reciboConformidad.findUnique({
    where: { id },
    include: { unidad: { select: { clienteId: true } } },
  });
  if (!recibo) notFound();

  const session = await getAdminUser();
  const confirmado = recibo.estado === "confirmado";
  const integro = confirmado ? verificarHash(recibo) : null;
  const texto = recibo.textoConfirmado ?? textoPlano(construirTextoRecibo(datosTexto(recibo)));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <Link href="/admin/recibos" className="text-sm text-stone-500 hover:text-stone-700">
        ← Volver a Recibos
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Recibo en Conformidad</p>
          <h1 className="text-2xl font-bold text-[#2F2F2F] flex items-center gap-3">
            {recibo.numeroRecibo} <EstadoReciboChip estado={recibo.estado} />
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            <Link href={`/admin/clientes/${recibo.unidad.clienteId}`} className="text-sage-600 hover:text-sage-700 font-medium">
              {recibo.clienteNombre}
            </Link>{" "}
            ·{" "}
            <Link href={`/admin/unidades/${recibo.unidadId}`} className="text-sage-600 hover:text-sage-700 font-medium">
              {recibo.numeroUnidad}
            </Link>
          </p>
        </div>
        {confirmado && (
          <a
            href={`/api/admin/recibos/${recibo.id}/pdf`}
            className="shrink-0 px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg"
          >
            Descargar PDF
          </a>
        )}
      </div>

      {email === "enviado" && (
        <p role="status" className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Recibo creado. Le enviamos al cliente el email con el link de confirmación.
        </p>
      )}
      {email === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Recibo creado, pero no se pudo enviar el email. Probá con &quot;Reenviar email&quot;.
        </p>
      )}

      <ReciboAcciones id={recibo.id} estado={recibo.estado} puedeAnular={!!session && isAdmin(session.rol)} />

      <section className={card}>
        <h2 className={tituloCard}>Datos</h2>
        <dl className="text-sm divide-y divide-[#F0F0F0]">
          <Fila label="Cliente">{recibo.clienteNombre}</Fila>
          <Fila label="DNI">{recibo.clienteDni ?? "—"}</Fila>
          <Fila label="CUIT">{recibo.clienteCuit ?? "—"}</Fila>
          <Fila label="Email">{recibo.clienteEmail}</Fila>
          <Fila label="Teléfono">{recibo.clienteTelefono ?? "—"}</Fila>
          <Fila label="Unidad">{recibo.numeroUnidad}</Fila>
          <Fila label="Modelo">{recibo.modelo}</Fila>
          <Fila label="Fecha de entrega">{fechaLargaUTC(recibo.fechaEntrega)}</Fila>
          <Fila label="Lugar">{recibo.lugarEntrega}</Fila>
          <Fila label="Observaciones">{recibo.observaciones ?? "Sin observaciones"}</Fila>
          <Fila label="Garantía">
            {fechaLargaUTC(recibo.fechaEntrega)} al {fechaLargaUTC(fechaFinGarantia(recibo.fechaEntrega))}
          </Fila>
          <Fila label="Creado">
            {fechaHoraAR(recibo.createdAt)} · {recibo.creadoPor}
          </Fila>
        </dl>
      </section>

      <section className={card}>
        <h2 className={tituloCard}>Evidencia</h2>
        <dl className="text-sm divide-y divide-[#F0F0F0]">
          <Fila label="Email con el link">
            {recibo.emailEnviadoAt ? `${fechaHoraAR(recibo.emailEnviadoAt)} · ${recibo.emailEnviadoA}` : "No enviado"}
          </Fila>
          {confirmado ? (
            <>
              <Fila label="Confirmado">{fechaHoraAR(recibo.confirmadoAt!)} (hora de Argentina)</Fila>
              <Fila label="IP">{recibo.ipConfirmacion ?? "—"}</Fila>
              <Fila label="Dispositivo">
                <span className="font-normal text-xs">{recibo.userAgent ?? "—"}</span>
              </Fila>
              <Fila label="Hash SHA-256">
                <span className="font-mono text-xs font-normal">{recibo.hashContenido}</span>
              </Fila>
              <Fila label="Verificación">
                {integro ? (
                  <span className="text-green-700">✓ Íntegro: el hash coincide con los datos guardados</span>
                ) : (
                  <span className="text-red-600">✗ No coincide: los datos guardados cambiaron después de la confirmación</span>
                )}
              </Fila>
            </>
          ) : (
            <Fila label="Confirmación">{recibo.estado === "anulado" ? "—" : "Pendiente"}</Fila>
          )}
          {recibo.anuladoAt && (
            <Fila label="Anulado">
              {fechaHoraAR(recibo.anuladoAt)} · {recibo.anuladoPor}
            </Fila>
          )}
        </dl>
      </section>

      <details className={card}>
        <summary className="cursor-pointer text-sm font-bold uppercase tracking-widest text-sage-600">
          {confirmado ? "Texto confirmado por el cliente" : "Texto del recibo"}
        </summary>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm text-stone-700 leading-relaxed">{texto}</pre>
      </details>
    </div>
  );
}
