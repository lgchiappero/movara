import { borrarHits, claveDe, claveIP, contarHits, registrarHit } from "@/lib/rate-limit-db";
import { resumenError } from "@/lib/log-seguro";

/** Bloqueo de intentos fallidos de login del admin, compartido entre
 * instancias (tabla rate_limit_hits). Dos contadores independientes:
 * - por IP: frena a quien prueba muchas contraseñas desde una conexión;
 * - por email: frena a quien prueba contra una cuenta desde muchas IPs.
 * Un login correcto limpia los dos. */

export const VENTANA_LOGIN_MS = 15 * 60_000;
export const MAX_FALLOS_IP = 5;
export const MAX_FALLOS_EMAIL = 10;

function claves(ip: string, email: string) {
  return { ip: claveIP("login-ip", ip), email: claveDe("login-email", email.trim().toLowerCase()) };
}

/** Si la tabla no responde, no se bloquea (con log): el login igual depende
 * de la base para leer el usuario. */
export async function loginBloqueado(ip: string, email: string): Promise<boolean> {
  const k = claves(ip, email);
  try {
    const [porIP, porEmail] = await Promise.all([contarHits(k.ip, VENTANA_LOGIN_MS), contarHits(k.email, VENTANA_LOGIN_MS)]);
    return porIP >= MAX_FALLOS_IP || porEmail >= MAX_FALLOS_EMAIL;
  } catch (err) {
    console.error(`[seguridad] Bloqueo de login no disponible: ${resumenError(err)}`);
    return false;
  }
}

export async function registrarFalloLogin(ip: string, email: string): Promise<void> {
  const k = claves(ip, email);
  await Promise.all([registrarHit(k.ip), registrarHit(k.email)]).catch((err) => {
    console.error(`[seguridad] No se pudo registrar el login fallido: ${resumenError(err)}`);
  });
}

export async function limpiarFallosLogin(ip: string, email: string): Promise<void> {
  const k = claves(ip, email);
  await Promise.all([borrarHits(k.ip), borrarHits(k.email)]).catch((err) => {
    console.error(`[seguridad] No se pudieron limpiar los fallos de login: ${resumenError(err)}`);
  });
}
