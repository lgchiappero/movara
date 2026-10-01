import { groq } from 'next-sanity'

export const MODELOS_QUERY = groq`
  *[_type == "modelo" && activo != false] | order(order asc, _createdAt asc) {
    _id,
    "slug": slug.current,
    name,
    tagline,
    "description": coalesce(descripcion, description),
    tamano,
    size,
    rooms,
    baths,
    incluyeCocina,
    incluyeBano,
    tag,
    "features": coalesce(upgrades, features),
    especificaciones[] { clave, valor },
    specs,
    images[defined(asset)] { "asset": asset, hotspot, crop, label },
    videos[] { url, titulo },
    video { url, label },
    maxHabitaciones,
    permiteCocinaSiMax3Hab,
    finalidades,
    destacado,
    activo,
    order,
    proximamente,
  }
`

// Versión liviana para listados tipo card (home + catálogo básico) — trae
// solo lo necesario para pintar la card, no toda la ficha del modelo.
export const MODELOS_HOME_QUERY = groq`
  *[_type == "modelo" && activo != false] | order(order asc) {
    _id,
    "nombre": name,
    "slug": slug.current,
    tagline,
    "imagen": images[0].asset->url,
    proximamente
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
    incluyeCocina,
    incluyeBano,
    tag,
    "features": coalesce(upgrades, features),
    especificaciones[] { clave, valor },
    specs,
    images[defined(asset)] { "asset": asset, hotspot, crop, label },
    videos[] { url, titulo },
    video { url, label },
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
    precioBaseM2,
    precioAdicionalDefault,
    preciosExtras[] { nombre, precio },
  }
`

// Versión liviana de los cupos de preventa, para la barra sticky global
// (se muestra en todo el sitio, no solo en el home donde vive HOME_PAGE_QUERY).
export const CUPOS_QUERY = groq`
  *[_type == "homePage"][0].preventa {
    totalUnidades,
    unidadesReservadas,
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

export const CONFIGURADOR_MODELOS_QUERY = groq`
  *[_type == "configuradorModelos"][0] {
    flex18 {
      imagenPrincipal,
      galeria[defined(asset)] { "asset": asset, hotspot, crop, label },
    },
    flex38 {
      imagenPrincipal,
      galeria[defined(asset)] { "asset": asset, hotspot, crop, label },
    },
    flex77 {
      imagenPrincipal,
      galeria[defined(asset)] { "asset": asset, hotspot, crop, label },
    },
  }
`

export const FLEX_CARD_QUERY = groq`
  *[_type == "flexPage"][0] {
    "nombre": hero.title,
    "imagen": galeria[defined(asset)][0]{ asset, hotspot, crop },
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
      problemas[] { _key, icono, titulo, descripcion, lineaImpacto },
      separador,
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
      titulo,
      subtitulo,
      ctaVerModelo,
      ctaCatalogo,
    },
    pruebaSocial {
      badgeSeccion,
      titulo,
      subtitulo,
      badges[] { _key, iconoLucide, titulo, descripcion, badge },
      textoCierre,
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

export const FLEX_PAGE_QUERY = groq`
  *[_type == "flexPage"][0] {
    hero {
      title,
      ctaPrimario,
    },
    galeria[defined(asset)] { "asset": asset, hotspot, crop, label },
    galeriaVideos[] { url, titulo },
    descripcion,
    precioPorM2,
    precioNota,
    specsClave,
    extrasDisponibles,
  }
`

export const FAQ_PAGE_QUERY = groq`
  *[_type == "faqPage"][0] {
    categorias[] {
      _key,
      titulo,
      icono,
      preguntas[] {
        _key,
        pregunta,
        respuesta,
        "tabla": tabla{ columnas, "filas": filas[].celdas },
      },
    },
  }
`
