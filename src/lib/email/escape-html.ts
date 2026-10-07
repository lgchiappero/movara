const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa texto ingresado por usuarios antes de interpolarlo en el HTML de
 * un email — sin esto, un formulario público podía inyectar links y
 * contenido arbitrario en emails enviados desde el dominio de MOVARA. */
export function escapeHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}
