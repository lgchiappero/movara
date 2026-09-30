import type { PasoInfo, AccionItem } from "@/lib/envios/timeline";

function formatFecha(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

/** Traduce la clave semántica de una acción a un href real. Las secciones
 * de envío (04/05/06) viven en /admin/envios/[id] (ahí es donde se puede
 * subir el archivo) — si la unidad todavía no tiene un envío vinculado, no
 * hay adónde ir, así que cae al propio formulario de la unidad para
 * vincular uno primero. Todo lo demás es un ancla dentro de esta misma
 * página. */
function resolverHref(anchor: string, envioId: string | null): string {
  if (anchor.startsWith("seccion-envio:")) {
    const key = anchor.split(":")[1];
    return envioId ? `/admin/envios/${envioId}#seccion-${key}` : "#datos-unidad";
  }
  if (anchor.startsWith("seccion-unidad:")) {
    const key = anchor.split(":")[1];
    return `#seccion-${key}`;
  }
  if (anchor === "estado") return "#estado-fabricacion";
  return `#${anchor}`;
}

export default function UnidadTimeline({
  pasos,
  actual,
  envioId,
}: {
  pasos: PasoInfo[];
  actual: { titulo: string; acciones: AccionItem[] } | null;
  envioId: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">Línea de tiempo</h2>
      <ol className="space-y-0">
        {pasos.map((paso, i) => {
          const esUltimo = i === pasos.length - 1;
          const fecha = formatFecha(paso.fecha);
          return (
            <li key={paso.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                    paso.estado === "completado"
                      ? "bg-emerald-100 text-emerald-700"
                      : paso.estado === "actual"
                        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400"
                        : "bg-stone-100 text-stone-400"
                  }`}
                  aria-hidden
                >
                  {paso.estado === "completado" ? "✅" : paso.estado === "actual" ? "🔵" : "⏳"}
                </span>
                {!esUltimo && (
                  <span className={`w-0.5 flex-1 min-h-[24px] ${paso.estado === "completado" ? "bg-emerald-200" : "bg-stone-200"}`} />
                )}
              </div>
              <div className={`pb-5 ${esUltimo ? "" : ""} min-w-0 flex-1`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`text-sm font-bold ${
                      paso.estado === "pendiente" ? "text-stone-400" : "text-[#2F2F2F]"
                    }`}
                  >
                    {paso.titulo}
                  </p>
                  {fecha && <span className="text-xs text-stone-400">{fecha}</span>}
                </div>

                {paso.estado === "actual" && actual && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                    {actual.titulo !== paso.titulo && (
                      <p className="text-xs font-bold text-blue-700">{actual.titulo}</p>
                    )}
                    {actual.acciones.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-blue-700 mb-1">⚡ Próximo paso:</p>
                        <ul className="space-y-1">
                          {actual.acciones.map((accion) => (
                            <li key={accion.texto}>
                              <a
                                href={resolverHref(accion.anchor, envioId)}
                                className="text-xs text-sage-600 hover:text-sage-700 font-medium hover:underline"
                              >
                                {accion.texto} →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
