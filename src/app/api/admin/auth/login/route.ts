import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP } from "@/lib/rate-limit";
import { isLockedOut, recordFailedAttempt, resetAttempts } from "@/lib/admin/login-rate-limit";
import { verifyPassword } from "@/lib/admin/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/admin/session";
import { adminLoginSchema } from "@/lib/validators/admin-login";

const GENERIC_ERROR = "Email o contraseña incorrectos";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  if (isLockedOut(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await db.adminUser.findUnique({ where: { email } });

  // verifyPassword corre bcrypt.compare incluso cuando `user` es null (hash
  // dummy) — el tiempo de respuesta y el mensaje no delatan si el email
  // existe o si la cuenta está desactivada.
  const validPassword = await verifyPassword(password, user?.password ?? null);
  const validLogin = validPassword && user !== null && user.activo;

  if (!validLogin) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  resetAttempts(ip);
  await db.adminUser.update({ where: { id: user.id }, data: { ultimoLogin: new Date() } });

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return res;
}
