import { groq } from 'next-sanity'

export const MODELOS_QUERY = groq`
  *[_type == "modelo"] | order(order asc, _createdAt asc) {
    _id,
    "slug": slug.current,
    name,
    category,
    tagline,
    description,
    size,
    rooms,
    baths,
    priceUSD,
    tag,
    features,
    specs,
    images[] {
      "asset": asset,
      hotspot,
      crop,
      label,
    },
    order,
  }
`

export const MODELO_BY_SLUG_QUERY = groq`
  *[_type == "modelo" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    name,
    category,
    tagline,
    description,
    size,
    rooms,
    baths,
    priceUSD,
    tag,
    features,
    specs,
    images[] {
      "asset": asset,
      hotspot,
      crop,
      label,
    },
  }
`

export const TESTIMONIOS_QUERY = groq`
  *[_type == "testimonio"] | order(order asc, _createdAt asc) {
    _id,
    quote,
    nombre,
    rol,
    ciudad,
    isFeatured,
  }
`

export const SITE_CONFIG_QUERY = groq`
  *[_type == "siteConfig"][0] {
    whatsappNumber,
    email,
    phone,
    address,
    instagram,
    linkedin,
    businessHours,
  }
`

export const MODELO_SLUGS_QUERY = groq`
  *[_type == "modelo"] { "slug": slug.current }
`
