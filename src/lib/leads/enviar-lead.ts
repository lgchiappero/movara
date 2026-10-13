/** Mensaje cuando /api/leads no pudo guardar la consulta (503). Lo usan la
 * ruta y los formularios, que lo muestran junto a un botón de WhatsApp. */
export const MENSAJE_LEAD_NO_GUARDADO = "No pudimos registrar tu consulta. Escribinos por WhatsApp";

export type ResultadoLead = "ok" | "no-guardado" | "error";

/** POST a /api/leads. "no-guardado" = la base no registró la consulta (503):
 * el formulario ofrece WhatsApp para que no se pierda. Nunca lanza. */
export async function enviarLead(body: Record<string, unknown>): Promise<ResultadoLead> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return "ok";
    return res.status === 503 ? "no-guardado" : "error";
  } catch {
    return "error";
  }
}

/** Texto de WhatsApp con lo que la persona cargó en el formulario, para que
 * la consulta llegue aunque no haya quedado registrada. Se envía recién
 * cuando la persona lo manda desde WhatsApp. */
export function mensajeWhatsAppConsulta(datos: {
  nombre: string;
  apellido?: string;
  telefono?: string;
  provincia?: string;
  mensaje?: string;
}): string {
  const nombre = [datos.nombre, datos.apellido].map((v) => v?.trim()).filter(Boolean).join(" ");
  return [
    "Hola MOVARA! Quiero hacer una consulta.",
    nombre && `Soy ${nombre}${datos.provincia ? `, de ${datos.provincia}` : ""}.`,
    datos.telefono?.trim() && `Mi teléfono es ${datos.telefono.trim()}.`,
    datos.mensaje?.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}
