import { getSignedUrl, BUCKET_MOVARA } from "@/lib/admin/storage";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

/** Resuelve la URL firmada del comprobante de cada movimiento — server-only,
 * se usa solo en las lecturas donde el detalle expandido necesita mostrar
 * el link de ver/descargar (no en todas: serializeAcuerdo por defecto deja
 * comprobanteSignedUrl en null para no pagar el costo en lecturas que no
 * lo muestran, como el PDF de estado de cuenta). */
export async function conComprobantesFirmados(acuerdos: AcuerdoConDetalle[]): Promise<AcuerdoConDetalle[]> {
  return Promise.all(
    acuerdos.map(async (a) => ({
      ...a,
      movimientos: await Promise.all(
        a.movimientos.map(async (m) => ({
          ...m,
          comprobanteSignedUrl: m.comprobanteUrl ? await getSignedUrl(BUCKET_MOVARA, m.comprobanteUrl) : null,
        }))
      ),
    }))
  );
}
