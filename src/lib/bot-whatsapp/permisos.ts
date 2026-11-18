import { NextResponse } from "next/server";
import { getAdminUser, type AdminSession } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { claveDe } from "@/lib/rate-limit-db";
import { permitirClave, demasiadosPedidos } from "@/lib/seguridad/publico";

/** Permisos del panel del bot (se validan en el servidor, en cada ruta):
 * - administrador: todo;
 * - vendedor: ver, editar leads (calificación, estado, notas, próximo
 *   contacto, control humano), agregar leads y excluidos, ver el gasto.
 *   NO puede prender/apagar el bot, cambiar la configuración, borrar leads
 *   ni borrar excluidos. */

export const SOLO_ADMIN = "Solo un administrador puede hacer esto";

/** Límite de escrituras por usuario del admin: alcanza para el uso normal
 * y frena un script (mismo rate limit compartido de la fase 1). */
export const LIMITE_ESCRITURAS = { max: 120, ventanaMs: 60_000 };

type Resultado = { ok: true; sesion: AdminSession } | { ok: false; respuesta: NextResponse };

/** Sesión del admin (src/proxy.ts ya la verificó). Si `soloAdmin`, 403 al
 * vendedor. Si `escritura`, consume el rate limit del usuario. */
export async function exigirSesion(opciones: { soloAdmin?: boolean; escritura?: boolean } = {}): Promise<Resultado> {
  const sesion = await getAdminUser();
  if (!sesion) return { ok: false, respuesta: NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 }) };
  if (opciones.soloAdmin && !isAdmin(sesion.rol)) {
    return { ok: false, respuesta: NextResponse.json({ error: SOLO_ADMIN }, { status: 403 }) };
  }
  if (opciones.escritura) {
    const permitido = await permitirClave(claveDe("bot-whatsapp", sesion.id), "bot-whatsapp", LIMITE_ESCRITURAS);
    if (!permitido) return { ok: false, respuesta: demasiadosPedidos("Demasiados cambios seguidos. Esperá un minuto.") };
  }
  return { ok: true, sesion };
}
