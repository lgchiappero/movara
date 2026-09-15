import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "movara_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 horas

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("[admin] AUTH_SECRET no configurado");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { sub: string };

/** El JWT solo lleva el id de usuario — nunca rol ni estado activo, que se
 * leen en vivo de la base en cada request (ver src/proxy.ts). Así, desactivar
 * un usuario o cambiarle el rol aplica de inmediato sin esperar a que expire
 * el token. */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = payload.sub;
    if (!sub) return null;
    return { sub };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
