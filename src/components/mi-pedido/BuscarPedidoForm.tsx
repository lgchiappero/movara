"use client";

import { useEffect, useState } from "react";
import {
  estadoPedidoOptions,
  estadoPedidoLabels,
  estadoPedidoIndex,
  type EstadoPedido,
} from "@/lib/pedido/estado-pedido";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type Pedido = {
  numeroConsulta: string | null;
  numeroPedido: string | null;
  clienteNombre: string;
  modelo: string | null;
  notasCliente: string | null;
  estadoPedido: EstadoPedido;
  fechaConfirmacion: string | null;
  fechaProduccion: string | null;
  fechaDespacho: string | null;
  fechaArriboEstimado: string | null;
  fechaEntrega: string | null;
};

const FECHA_POR_ESTADO: Record<EstadoPedido, keyof Pedido | null> = {
  consulta: null,
  presupuestado: null,
  confirmado: "fechaConfirmacion",
  en_produccion: "fechaProduccion",
  en_transito: "fechaDespacho",
  en_aduana: "fechaArriboEstimado",
  entregado: "fechaEntrega",
};

function formatFecha(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Vista de seguimiento: solo se accede con el token secreto del link
 * (/mi-pedido?t=...). Sin token no hay búsqueda posible — los códigos de
 * pedido son correlativos y no alcanzan para identificar al dueño. */
export default function BuscarPedidoForm({ token }: { token: string | null }) {
  const [loading, setLoading] = useState(token !== null);
  const [error, setError] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/mi-pedido", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json().catch(() => null);
        if (cancelado) return;
        if (!res.ok) {
          setError(json?.error ?? "No pudimos encontrar tu pedido.");
          return;
        }
        setPedido(json);
      } catch {
        if (!cancelado) setError("No pudimos cargar tu pedido. Probá de nuevo.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [token]);

  const currentIndex = pedido ? estadoPedidoIndex(pedido.estadoPedido) : -1;
  const codigoMostrado = pedido ? (pedido.numeroPedido ?? pedido.numeroConsulta) : null;

  return (
    <div className="space-y-6">
      {!token && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4 text-sm text-stone-600">
          <p>
            Para ver tu pedido necesitás el link de seguimiento que te enviamos por email o WhatsApp.
            Si no lo tenés, pedínoslo y te lo reenviamos.
          </p>
          <a
            href={getWhatsAppUrl("Hola! Necesito el link de seguimiento de mi pedido MOVARA.")}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-2.5 border border-sage-500 text-sage-600 font-bold text-sm rounded-xl hover:bg-sage-50 transition-colors"
          >
            Pedir mi link por WhatsApp
          </a>
        </div>
      )}
      {loading && <p className="text-sm text-stone-500">Cargando tu pedido...</p>}
      {error && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <a
            href={getWhatsAppUrl("Hola! Mi link de seguimiento MOVARA no funciona, ¿me mandan uno nuevo?")}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-2.5 border border-sage-500 text-sage-600 font-bold text-sm rounded-xl hover:bg-sage-50 transition-colors"
          >
            Pedir un link nuevo por WhatsApp
          </a>
        </div>
      )}

      {pedido && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-6">
          <div>
            <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">
              {codigoMostrado}
            </p>
            <h2 className="text-lg font-bold text-[#2F2F2F]">{pedido.clienteNombre}</h2>
            {pedido.modelo && <p className="text-sm text-stone-600">{pedido.modelo}</p>}
          </div>

          <ol className="space-y-0">
            {estadoPedidoOptions.map((estado, i) => {
              const done = i <= currentIndex;
              const isLast = i === estadoPedidoOptions.length - 1;
              const fechaKey = FECHA_POR_ESTADO[estado];
              const fecha = fechaKey ? formatFecha(pedido[fechaKey] as string | null) : null;
              return (
                <li key={estado} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        done ? "bg-sage-500" : "bg-[#E5E5E5]"
                      }`}
                    />
                    {!isLast && (
                      <div className={`w-px flex-1 ${done ? "bg-sage-500" : "bg-[#E5E5E5]"}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p
                      className={`text-sm font-medium ${
                        done ? "text-[#2F2F2F]" : "text-stone-400"
                      }`}
                    >
                      {estadoPedidoLabels[estado]}
                    </p>
                    {fecha && <p className="text-xs text-stone-500">{fecha}</p>}
                  </div>
                </li>
              );
            })}
          </ol>

          {pedido.notasCliente && (
            <div className="bg-[#F9F5EE] rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-sage-600 mb-1">
                Notas de tu pedido
              </p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{pedido.notasCliente}</p>
            </div>
          )}

          <a
            href={getWhatsAppUrl(`Hola! Quería consultar por mi pedido ${codigoMostrado}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-2.5 border border-sage-500 text-sage-600 font-bold text-sm rounded-xl hover:bg-sage-50 transition-colors"
          >
            Contactar por WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
