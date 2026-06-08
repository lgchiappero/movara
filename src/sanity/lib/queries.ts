import { groq } from 'next-sanity'

export const MODELOS_QUERY = groq`
  *[_type == "modelo"] | order(order asc, _createdAt asc) {
    _id,
    "slug": slug.current,
    name,
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
    video { url, label },
    virtualTour,
    maxHabitaciones,
    permiteCocinaSiMax3Hab,
    order,
  }
`

export const MODELO_BY_SLUG_QUERY = groq`
  *[_type == "modelo" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    name,
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
    video { url, label },
    virtualTour,
    maxHabitaciones,
    permiteCocinaSiMax3Hab,
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
    metaTitle,
    metaDescription,
    logo,
    favicon,
  }
`

export const HOME_PAGE_QUERY = groq`
  *[_type == "homePage"][0] {
    hero {
      badgeText,
      title,
      subtitle,
      ctaPrimaryText,
      ctaSecondaryText,
      stats[] { value, label },
    },
    whyHabitatt {
      title,
      subtitle,
      pillars[] { _key, title, description },
    },
    usos {
      title,
      subtitle,
      items[] { _key, emoji, category, title, description, href, statValue, statLabel },
    },
    process {
      title,
      subtitle,
      steps[] { _key, title, description },
    },
    cta {
      title,
      subtitle,
      ctaText,
    },
  }
`

export const QUIENES_SOMOS_QUERY = groq`
  *[_type == "quienesSomos"][0] {
    hero { title, subtitle },
    historia,
    vision,
    mision,
    equipo[] {
      _key,
      name,
      role,
      bio,
      photo,
    },
    valores[] { _key, title, description },
  }
`

export const MODELO_SLUGS_QUERY = groq`
  *[_type == "modelo"] { "slug": slug.current }
`
