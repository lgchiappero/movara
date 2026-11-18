/** Llamadas del panel a /api/admin/bot-whatsapp. Devuelven el JSON o tiran
 * un Error con el mensaje del servidor (para mostrarlo en un toast). */
export async function llamarApi<T = unknown>(url: string, metodo: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: metodo,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error((json && typeof json.error === "string" && json.error) || "No se pudo guardar") as Error & {
      status?: number;
      datos?: unknown;
    };
    error.status = res.status;
    error.datos = json;
    throw error;
  }
  return json as T;
}
