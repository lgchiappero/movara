import { estadoFabricacionIndex, type EstadoFabricacion } from "@/lib/envios/constantes";

/** El envío está tan avanzado como su unidad menos avanzada — compartido
 * entre /admin/envios (lista) y el dashboard operativo para no repetir el
 * criterio en dos lugares. */
export function estadoGeneralEnvio(unidades: { estadoFabricacion: string }[]): EstadoFabricacion | null {
  if (unidades.length === 0) return null;
  return unidades.reduce((min, u) => {
    return estadoFabricacionIndex(u.estadoFabricacion) < estadoFabricacionIndex(min)
      ? u.estadoFabricacion
      : min;
  }, unidades[0].estadoFabricacion) as EstadoFabricacion;
}
