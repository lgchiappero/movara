import { groq } from 'next-sanity'

export const MODELOS_QUERY = groq`
  *[_type == "modelo" && activo != false] | order(destacado desc, order asc, _createdAt asc) {
    _id,
    "slug": slug.current,
    name,
    tagline,
    "description": coalesce(descripcion, description),
    tamano,
    size,
    rooms,
    baths,
    priceUSD,
    precioHasta,
    incluyeCocina,
    incluyeBano,
    tag,
    "features": coalesce(upgrades, features),
    especificaciones[] { clave, valor },
    specs,
    images[] { "asset": asset, hotspot, crop, label },
    video { url, label },
    virtualTour,
    maxHabitaciones,
    permiteCocinaSiMax3Hab,
    finalidades,
    destacado,
    activo,
    order,
  }
`

export const MODELO_BY_SLUG_QUERY = groq`
  *[_type == "modelo" && slug.current == $slug][0] {
    _id,
    "slug": slug.current,
    name,
    tagline,
    "description": coalesce(descripcion, description),
    tamano,
    size,
    rooms,
    baths,
    priceUSD,
    precioHasta,
    incluyeCocina,
    incluyeBano,
    tag,
    "features": coalesce(upgrades, features),
    especificaciones[] { clave, valor },
    specs,
    images[] { "asset": asset, hotspot, crop, label },
    video { url, label },
    virtualTour,
    maxHabitaciones,
    permiteCocinaSiMax3Hab,
    finalidades,
    destacado,
    activo,
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
    whatsappHorario,
    whatsappRespuesta,
    email,
    phone,
    address,
    instagram,
    linkedin,
    businessHours,
    footerDescription,
    footerNavLinks[] { label, url },
    copyrightText,
    metaTitle,
    metaDescription,
    logo,
    favicon,
  }
`

export const CONFIGURADOR_PAGE_QUERY = groq`
  *[_type == "configuradorPage"][0] {
    paso1 {
      title,
      subtitle,
      modelo10ft,
      modelo20ft,
      modelo40ft,
    },
    paso2 {
      title,
      subtitle,
      descInversor,
      descAgro,
      descVivienda,
      descTurismo,
      descEmpresa,
      descSectorPublico,
    },
    paso3 {
      title,
      subtitle,
      localidadLabel,
      provinciaLabel,
    },
    resultado {
      title,
      waButtonText,
      trustText,
    },
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
    regionalBanner {
      title,
      subtitle,
    },
    whyMovara {
      title,
      subtitle,
      pillars[] { _key, icon, title, description },
    },
    featuredModels {
      title,
      subtitle,
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
    testimonials {
      title,
      subtitle,
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
    hero {
      title,
      subtitle,
      backgroundImage { asset->{ _id, url }, hotspot, crop },
    },
    historia { title, content },
    mision { title, text },
    vision { title, text },
    valores[] { _key, icon, title, description },
    equipo[] {
      _key,
      name,
      role,
      bio,
      photo,
    },
  }
`

export const MODELO_SLUGS_QUERY = groq`
  *[_type == "modelo"] { "slug": slug.current }
`
