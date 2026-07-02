import { defineField, defineType, defineArrayMember } from 'sanity'

const FINALIDADES_LIST = [
  { title: 'Inversor / Renta', value: 'inversor' },
  { title: 'Agro / Campo', value: 'agro' },
  { title: 'Primera vivienda', value: 'vivienda' },
  { title: 'Turismo y hospitalidad', value: 'turismo' },
  { title: 'Empresa / B2B', value: 'empresa' },
  { title: 'Sector público', value: 'sector-publico' },
]

export const modeloType = defineType({
  name: 'modelo',
  title: 'Modelo',
  type: 'document',
  groups: [
    { name: 'identificacion', title: 'Identificación' },
    { name: 'precios', title: 'Precios' },
    { name: 'dimensiones', title: 'Dimensiones e incluidos' },
    { name: 'media', title: 'Fotos y multimedia' },
    { name: 'especificaciones', title: 'Especificaciones' },
    { name: 'marketing', title: 'Marketing y visibilidad' },
  ],
  fields: [
    // ── Identificación ──────────────────────────────────────
    defineField({
      name: 'name',
      title: 'Nombre',
      type: 'string',
      group: 'identificacion',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'identificacion',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Una línea corta que resume el modelo',
      group: 'identificacion',
    }),
    defineField({
      name: 'tamano',
      title: 'Tamaño',
      type: 'string',
      group: 'identificacion',
      description: 'Tamaño del contenedor base. Conecta con el Configurador.',
      options: {
        list: [
          { title: '10ft — 18 m²', value: '10ft' },
          { title: '20ft — 37 m²', value: '20ft' },
          { title: '40ft — 74 m²', value: '40ft' },
        ],
        layout: 'radio',
      },
    }),

    // ── Precios ─────────────────────────────────────────────
    defineField({
      name: 'priceUSD',
      title: 'Precio desde (USD)',
      type: 'number',
      group: 'precios',
    }),
    defineField({
      name: 'precioHasta',
      title: 'Precio hasta (USD)',
      type: 'number',
      description: 'Si se completa, se muestra un rango: "Desde USD X – USD Y"',
      group: 'precios',
    }),

    // ── Dimensiones e incluidos ─────────────────────────────
    defineField({
      name: 'size',
      title: 'Superficie total (m²)',
      type: 'number',
      group: 'dimensiones',
    }),
    defineField({
      name: 'rooms',
      title: 'Ambientes / Habitaciones',
      type: 'number',
      group: 'dimensiones',
    }),
    defineField({
      name: 'baths',
      title: 'Baños',
      type: 'number',
      group: 'dimensiones',
    }),
    defineField({
      name: 'maxHabitaciones',
      title: 'Máximo de habitaciones posibles',
      type: 'number',
      description: 'Límite físico del modelo. El configurador no ofrecerá más opciones.',
      initialValue: 4,
      validation: (Rule) => Rule.min(1).max(6).integer(),
      group: 'dimensiones',
    }),
    defineField({
      name: 'incluyeCocina',
      title: '¿Incluye cocina de serie?',
      type: 'boolean',
      description: 'Si está activado, el módulo estándar incluye cocina.',
      initialValue: true,
      group: 'dimensiones',
    }),
    defineField({
      name: 'incluyeBano',
      title: '¿Incluye baño de serie?',
      type: 'boolean',
      description: 'Si está activado, el módulo estándar incluye baño.',
      initialValue: true,
      group: 'dimensiones',
    }),
    defineField({
      name: 'permiteCocinaSiMax3Hab',
      title: '¿Permite cocina con 3 o más habitaciones?',
      type: 'boolean',
      description: 'Si está desactivado, el configurador avisará que la cocina no entra con 3+ habitaciones.',
      initialValue: true,
      group: 'dimensiones',
    }),

    // ── Media ────────────────────────────────────────────────
    defineField({
      name: 'images',
      title: 'Galería de fotos',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'label',
              title: 'Etiqueta',
              type: 'string',
              description: 'Ej: Vista exterior, Sala de estar',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'videos',
      title: 'Videos del modelo',
      type: 'array',
      group: 'media',
      description: 'Agregá uno o más videos de YouTube o Vimeo.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'url',
              title: 'URL del video',
              type: 'url',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'titulo',
              title: 'Título',
              type: 'string',
              initialValue: 'Video del modelo',
            }),
          ],
          preview: {
            select: { title: 'titulo', subtitle: 'url' },
          },
        }),
      ],
    }),
    defineField({
      name: 'video',
      title: 'Video (legado)',
      type: 'object',
      group: 'media',
      description: 'Campo heredado. Usar "Videos del modelo" para nuevos modelos.',
      hidden: true,
      fields: [
        defineField({ name: 'url', title: 'URL', type: 'url', validation: (Rule) => Rule.required() }),
        defineField({ name: 'label', title: 'Etiqueta', type: 'string', initialValue: 'Video del modelo' }),
      ],
    }),
    defineField({
      name: 'virtualTour',
      title: 'Tour virtual 360° (URL)',
      type: 'url',
      group: 'media',
      description: 'URL de Matterport, Google Street View u otro recorrido virtual embebible.',
    }),

    // ── Especificaciones ─────────────────────────────────────
    defineField({
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
      rows: 5,
      group: 'especificaciones',
    }),
    defineField({
      name: 'description',
      title: 'Descripción (legado)',
      type: 'text',
      rows: 5,
      description: 'Campo heredado. Usar "Descripción" para modelos nuevos.',
      hidden: true,
    }),
    defineField({
      name: 'upgrades',
      title: 'Upgrades incluidos',
      type: 'array',
      group: 'especificaciones',
      description: 'Lista de características o upgrades incluidos en el precio base.',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'features',
      title: 'Características (legado)',
      type: 'array',
      description: 'Campo heredado. Usar "Upgrades incluidos" para modelos nuevos.',
      hidden: true,
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'especificaciones',
      title: 'Especificaciones técnicas',
      type: 'array',
      group: 'especificaciones',
      description: 'Tabla libre de especificaciones técnicas (clave → valor).',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'clave', title: 'Especificación', type: 'string' }),
            defineField({ name: 'valor', title: 'Valor', type: 'string' }),
          ],
          preview: {
            select: { title: 'clave', subtitle: 'valor' },
          },
        }),
      ],
    }),
    defineField({
      name: 'specs',
      title: 'Especificaciones fijas (legado)',
      type: 'object',
      description: 'Campo heredado. Usar "Especificaciones técnicas" para modelos nuevos.',
      hidden: true,
      fields: [
        defineField({ name: 'estructura', title: 'Estructura', type: 'string' }),
        defineField({ name: 'cubierta', title: 'Cubierta', type: 'string' }),
        defineField({ name: 'cerramiento', title: 'Cerramiento', type: 'string' }),
        defineField({ name: 'aislacion', title: 'Aislación', type: 'string' }),
        defineField({ name: 'instalaciones', title: 'Instalaciones', type: 'string' }),
        defineField({ name: 'terminaciones', title: 'Terminaciones', type: 'string' }),
        defineField({ name: 'tiempo', title: 'Tiempo de obra', type: 'string' }),
        defineField({ name: 'garantia', title: 'Garantía', type: 'string' }),
      ],
    }),

    // ── Marketing y visibilidad ──────────────────────────────
    defineField({
      name: 'tag',
      title: 'Etiqueta destacada',
      type: 'string',
      description: 'Ej: Más elegido, Premium, Ideal inversión',
      group: 'marketing',
    }),
    defineField({
      name: 'finalidades',
      title: 'Usos recomendados',
      type: 'array',
      group: 'marketing',
      description: 'Seleccioná los usos para los que este modelo es ideal.',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: FINALIDADES_LIST,
      },
    }),
    defineField({
      name: 'destacado',
      title: '¿Modelo destacado?',
      type: 'boolean',
      description: 'Los modelos destacados aparecen primero en el catálogo.',
      initialValue: false,
      group: 'marketing',
    }),
    defineField({
      name: 'activo',
      title: '¿Modelo activo?',
      type: 'boolean',
      description: 'Los modelos inactivos no se muestran en el sitio.',
      initialValue: true,
      group: 'marketing',
    }),
    defineField({
      name: 'order',
      title: 'Orden en el catálogo',
      type: 'number',
      description: 'Menor número = aparece primero',
      initialValue: 99,
      group: 'marketing',
    }),
    defineField({
      name: 'tagsLanding',
      title: 'Tags para landing premium',
      type: 'array',
      group: 'marketing',
      description: 'Badges cortos visibles en la tarjeta de la landing (ej: Studio, Trabajo, Campo)',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'disponiblesPreventa',
      title: 'Unidades disponibles en preventa',
      type: 'number',
      group: 'marketing',
      description: 'Contador de escasez que aparece en la landing premium. 0 = no mostrar.',
      initialValue: 0,
    }),

    // Campos legado ocultos
    defineField({
      name: 'configuracionesValidas',
      title: 'Configuraciones válidas (legado)',
      type: 'array',
      hidden: true,
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'habitaciones', title: 'Habitaciones', type: 'number' }),
            defineField({ name: 'cocina', title: 'Incluye cocina', type: 'boolean' }),
            defineField({ name: 'banio', title: 'Incluye baño', type: 'boolean' }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'tagline',
      media: 'images.0',
    },
  },
  orderings: [
    {
      title: 'Orden manual',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
})
