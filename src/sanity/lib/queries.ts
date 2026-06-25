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

export const HOME_MODELOS_QUERY = groq`
  *[_type == "modelo" && activo != false] | order(order asc, _createdAt asc) [0...3] {
    _id,
    name,
    "slug": slug.current,
    "descripcion": coalesce(descripcion, description),
    tamano,
    size,
    priceUSD,
    tagsLanding,
    disponiblesPreventa,
    destacado,
  }
`

export const HOME_PAGE_QUERY = groq`
  *[_type == "homePage"][0] {
    hero {
      badgePreventa,
      titulo,
      tituloDestacado,
      subtitulo,
      ctaPrimario,
      ctaSecundario,
      trustStrip,
    },
    preventa {
      badgeEscasez,
      titulo,
      subtitulo,
      totalUnidades,
      unidadesReservadas,
      textoCierre,
      beneficios[] { _key, titulo, descripcion },
    },
    dossier {
      titulo,
      subtitulo,
      items,
      textoCTA,
    },
    nuevaCategoria {
      titulo,
      subtitulo,
      cita,
      columnas[] { _key, titulo, descripcion, destacado, tachado },
    },
    dolorConvencional {
      titulo,
      subtitulo,
      stats[] { _key, stat, label, sub },
      problemas,
      beneficios,
    },
    paraQuien {
      titulo,
      avatares[] { _key, icono, titulo, descripcion, cta },
    },
    comoFunciona {
      titulo,
      pasos[] { _key, titulo, descripcion },
    },
    formularioContacto {
      titulo,
      subtitulo,
      textoCTA,
    },
    modelosHome {
      badgeSeccion,
      titulo,
      badgePreventa,
      ctaReservar,
      ctaCatalogo,
    },
    pruebaSocial {
      badgeSeccion,
      titulo,
      badges[] { _key, icono, label },
      showroomTitulo,
      showroomDesc,
      showroomChip,
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
