// Compartido entre el navegador y el servidor (sin imports de servidor).

/** Destinos de subida del admin: a qué entidad y carpeta va cada archivo. */
export const DESTINOS_SUBIDA = ["pedidos", "envios", "unidades", "cobranza", "logistica"] as const;
export type DestinoSubida = (typeof DESTINOS_SUBIDA)[number];

/** Por encima de esto el navegador sube directo a Storage: Vercel corta los
 * cuerpos de más de 4,5 MB y el formulario lleva además los otros campos. */
export const UMBRAL_SUBIDA_DIRECTA_BYTES = 4 * 1024 * 1024;

/** Límite de cualquier archivo del admin. */
export const MAX_SUBIDA_BYTES = 20 * 1024 * 1024;

/** Nombre del campo del formulario que lleva la referencia a un archivo ya
 * subido directo a Storage (en vez del archivo). */
export function campoSubido(campo: string): string {
  return `${campo}Subido`;
}
