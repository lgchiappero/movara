// Migra el singleton "flexPage" (Página MOVARA Flex) a un documento "modelo"
// con slug "movara-flex" y order 1, y pone order 2 al Dúplex.
//
// Uso:
//   node scripts/migrate-flex.mjs                                        (con SANITY_API_TOKEN)
//   npx sanity exec scripts/migrate-flex.mjs --with-user-token           (con el login del CLI)
//
// Idempotente: el modelo usa un _id fijo y createOrReplace, así que correrlo
// de nuevo reescribe el mismo documento. No borra el flexPage original
// (queda como respaldo; ya no lo lee ninguna query).

import { createClient } from '@sanity/client'
import { existsSync } from 'node:fs'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_TOKEN

if (!projectId || !dataset) {
  console.error('Faltan NEXT_PUBLIC_SANITY_PROJECT_ID o NEXT_PUBLIC_SANITY_DATASET')
  process.exit(1)
}

// Sin SANITY_API_TOKEN, usa el token del usuario que inyecta
// `sanity exec --with-user-token`.
let client
if (token) {
  client = createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false, perspective: 'published' })
} else {
  const { getCliClient } = await import('sanity/cli')
  client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ perspective: 'published' })
  if (!client.config().token) {
    console.error('Sin SANITY_API_TOKEN: correr con `npx sanity exec scripts/migrate-flex.mjs --with-user-token`')
    process.exit(1)
  }
}

const FLEX_SLUG = 'movara-flex'
const FLEX_ID = 'modelo-movara-flex'

const flexPage = await client.fetch(`*[_type == "flexPage"][0]`)
if (!flexPage) {
  console.error('No se encontró ningún documento flexPage')
  process.exit(1)
}

const otroConSlug = await client.fetch(
  `*[_type == "modelo" && slug.current == $slug && _id != $id && !(_id in path("drafts.**"))][0]._id`,
  { slug: FLEX_SLUG, id: FLEX_ID },
)
if (otroConSlug) {
  console.error(`Ya existe otro modelo con slug "${FLEX_SLUG}" (${otroConSlug}). Abortando.`)
  process.exit(1)
}

const duplex = await client.fetch(
  `*[_type == "modelo" && slug.current match "*duplex*" && !(_id in path("drafts.**"))]{ _id, name }`,
)
if (duplex.length !== 1) {
  console.error(`Se esperaba exactamente un Dúplex, se encontraron ${duplex.length}. Abortando.`)
  process.exit(1)
}

// Mapeo flexPage → modelo. Renombres: hero.title → name,
// hero.ctaPrimario → ctaPrimario, galeria → images, galeriaVideos → videos.
const modelo = {
  _id: FLEX_ID,
  _type: 'modelo',
  name: flexPage.hero?.title || 'MOVARA Flex',
  slug: { _type: 'slug', current: FLEX_SLUG },
  order: 1,
  activo: true,
  ctaPrimario: flexPage.hero?.ctaPrimario,
  images: flexPage.galeria,
  videos: flexPage.galeriaVideos,
  descripcion: flexPage.descripcion,
  precioPorM2: flexPage.precioPorM2,
  precioNota: flexPage.precioNota,
  specsClave: flexPage.specsClave,
  extrasDisponibles: flexPage.extrasDisponibles,
}
for (const k of Object.keys(modelo)) if (modelo[k] === undefined) delete modelo[k]

await client
  .transaction()
  .createOrReplace(modelo)
  .patch(duplex[0]._id, (p) => p.set({ order: 2 }))
  .commit()

console.log(`✓ Modelo "${modelo.name}" (${FLEX_ID}) creado/actualizado con order 1`)
console.log(`  ${modelo.images?.length ?? 0} imágenes, ${modelo.videos?.length ?? 0} videos, ${modelo.specsClave?.length ?? 0} specs, ${modelo.extrasDisponibles?.length ?? 0} extras`)
console.log(`✓ "${duplex[0].name}" (${duplex[0]._id}) → order 2`)
