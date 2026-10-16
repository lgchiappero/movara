// Para tests de formularios que suben archivos: en jsdom no hay servidor
// para el XMLHttpRequest de enviarFormularioConArchivos, así que lo
// redirigimos al fetch (mockeado por cada test) con el mismo FormData.
// Uso: vi.mock("@/lib/admin/subida-cliente", subidaPorFetch);
import type * as SubidaCliente from "@/lib/admin/subida-cliente";

export async function subidaPorFetch(importOriginal: () => Promise<unknown>) {
  const real = (await importOriginal()) as typeof SubidaCliente;
  const enviarFormularioConArchivos: typeof real.enviarFormularioConArchivos = async ({ url, method = "POST", form, archivos }) => {
    for (const { campo, file } of archivos) form.set(campo, file);
    const res = await fetch(url, { method, body: form });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  };
  return { ...real, enviarFormularioConArchivos };
}
