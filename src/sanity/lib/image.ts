import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import { dataset, projectId } from '../env'

// https://www.sanity.io/docs/image-url
const builder = createImageUrlBuilder({ projectId, dataset })

export const urlFor = (source: SanityImageSource) => {
  return builder.image(source)
}

type Recorte = { top: number; bottom: number; left: number; right: number }
type Hotspot = { x: number; y: number; height?: number; width?: number }
/** crop y hotspot vienen de Sanity sin tipar: se validan acá. */
export type ImagenSanityConRecorte = {
  asset?: unknown
  crop?: unknown
  hotspot?: unknown
}

function esRecorte(c: unknown): c is Recorte {
  const r = c as Partial<Recorte> | null
  return !!r && ['top', 'bottom', 'left', 'right'].every((k) => typeof r[k as keyof Recorte] === 'number')
}

/** Las fotos del sitio se ven completas: se pide la imagen sin recortar
 *  (fit("max") con un solo eje, así no se fuerza ningún aspect) y en el
 *  formato que mejor soporte el navegador. Si en el Studio cargaron un
 *  recorte (crop), se respeta: es una decisión editorial. El hotspot no
 *  cambia nada acá (solo importa cuando se recorta; ver posicionHotspot). */
export function urlImagenCompleta(img: ImagenSanityConRecorte, ancho: number): string {
  const fuente = { asset: img.asset, ...(esRecorte(img.crop) ? { crop: img.crop } : {}) } as SanityImageSource
  return urlFor(fuente).width(ancho).fit('max').auto('format').url()
}

/** object-position para las fotos que sí se recortan a propósito (fondos de
 *  los heroes): centra el recorte en el hotspot elegido en el Studio. */
export function posicionHotspot(hotspot: unknown): string | undefined {
  const h = hotspot as Partial<Hotspot> | null | undefined
  if (!h || typeof h.x !== 'number' || typeof h.y !== 'number') return undefined
  const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 1000) / 10}%`
  return `${pct(h.x)} ${pct(h.y)}`
}
