import { ESTADO_RECIBO_COLORS, ESTADO_RECIBO_LABELS, esEstadoRecibo } from "@/lib/recibos/constantes";

export default function EstadoReciboChip({ estado }: { estado: string }) {
  const e = esEstadoRecibo(estado) ? estado : "pendiente";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${ESTADO_RECIBO_COLORS[e]}`}>
      {ESTADO_RECIBO_LABELS[e]}
    </span>
  );
}
