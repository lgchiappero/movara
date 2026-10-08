import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/current-user";
import { crearReciboSchema } from "@/lib/validators/recibo";
import { crearRecibo, enviarSolicitud } from "@/lib/recibos/servicio";
import { baseUrlLinks } from "@/lib/recibos/http";

/** Crea el Recibo en Conformidad y le manda al cliente el email con el link
 * de confirmación. Si el email falla, el recibo queda creado igual (se puede
 * reenviar desde el detalle) y la respuesta lo informa. */
export async function POST(req: NextRequest) {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const parsed = crearReciboSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos", details: parsed.error.issues }, { status: 400 });
  }

  const creado = await crearRecibo(parsed.data, session.email);
  if (!creado.ok) {
    return NextResponse.json({ error: creado.error }, { status: creado.status });
  }

  const email = await enviarSolicitud(creado.recibo, baseUrlLinks(req));
  return NextResponse.json(
    {
      ok: true,
      id: creado.recibo.id,
      numeroRecibo: creado.recibo.numeroRecibo,
      emailEnviado: email.ok,
      ...(email.ok ? {} : { emailError: email.error }),
    },
    { status: 201 }
  );
}
