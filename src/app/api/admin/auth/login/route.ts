import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ipCliente } from "@/lib/seguridad/ip";
import { MAX_BODY, leerJsonLimitado } from "@/lib/seguridad/publico";
import { limpiarFallosLogin, loginBloqueado, registrarFalloLogin } from "@/lib/seguridad/login";
import { verifyPassword } from "@/lib/admin/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/admin/session";
import { adminLoginSchema } from "@/lib/validators/admin-login";

const GENERIC_ERROR = "Email o contraseña incorrectos";
const BLOQUEADO = "Demasiados intentos. Probá de nuevo en unos minutos.";

export async function POST(req: NextRequest) {
  const ip = ipCliente(req);

  const lectura = await leerJsonLimitado(req, MAX_BODY.chico);
  if (!lectura.ok) return lectura.respuesta;
  const parsed = adminLoginSchema.safeParse(lectura.datos);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // Bloqueo compartido entre instancias (src/lib/seguridad/login.ts): por IP
  // y por email. Se chequea antes de tocar bcrypt: un bloqueado no consume
  // CPU ni puede seguir probando.
  if (await loginBloqueado(ip, email)) {
    return NextResponse.json({ error: BLOQUEADO }, { status: 429 });
  }

  const user = await db.adminUser.findUnique({ where: { email } });

  // verifyPassword corre bcrypt.compare incluso cuando `user` es null (hash
  // dummy) — el tiempo de respuesta y el mensaje no delatan si el email
  // existe o si la cuenta está desactivada.
  const validPassword = await verifyPassword(password, user?.password ?? null);
  const validLogin = validPassword && user !== null && user.activo;

  if (!validLogin) {
    await registrarFalloLogin(ip, email);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await limpiarFallosLogin(ip, email);
  await db.adminUser.update({ where: { id: user.id }, data: { ultimoLogin: new Date() } });

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return res;
}
