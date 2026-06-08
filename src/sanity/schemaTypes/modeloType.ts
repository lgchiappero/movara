import { defineField, defineType } from 'sanity'

export const modeloType = defineType({
  name: 'modelo',
  title: 'Modelo',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Una línea corta que resume el modelo',
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
      rows: 4,
    }),
    defineField({ name: 'size', title: 'Superficie (m²)', type: 'number' }),
    defineField({ name: 'rooms', title: 'Habitaciones / Ambientes', type: 'number' }),
    defineField({ name: 'baths', title: 'Baños', type: 'number' }),
    defineField({ name: 'priceUSD', title: 'Precio desde (USD)', type: 'number' }),
    defineField({
      name: 'tag',
      title: 'Etiqueta destacada',
      type: 'string',
      description: 'Ej: Más elegido, Premium, Ideal inversión',
    }),
    defineField({
      name: 'features',
      title: 'Características incluidas',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'images',
      title: 'Fotos del modelo',
      type: 'array',
      of: [
        {
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
        },
      ],
    }),
    defineField({
      name: 'maxHabitaciones',
      title: 'Máximo de habitaciones posibles',
      type: 'number',
      description: 'Límite físico del modelo. El wizard no ofrecerá más opciones que este número.',
      initialValue: 4,
      validation: (Rule) => Rule.min(1).max(4).integer(),
    }),
    defineField({
      name: 'permiteCocinaSiMax3Hab',
      title: '¿Permite cocina con 3 o más habitaciones?',
      type: 'boolean',
      description: 'Si está desactivado, el wizard avisará que la cocina no entra cuando el cliente elige 3+ habitaciones.',
      initialValue: true,
    }),
    defineField({
      name: 'configuracionesValidas',
      title: 'Configuraciones válidas (avanzado, opcional)',
      type: 'array',
      description: 'Lista explícita de combinaciones posibles. Si se completa, tiene prioridad sobre los campos anteriores.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'habitaciones', title: 'Habitaciones', type: 'number' }),
            defineField({ name: 'cocina', title: 'Incluye cocina', type: 'boolean' }),
            defineField({ name: 'banio', title: 'Incluye baño', type: 'boolean' }),
          ],
          preview: {
            select: { habitaciones: 'habitaciones', cocina: 'cocina', banio: 'banio' },
            prepare({ habitaciones, cocina, banio }: { habitaciones?: number; cocina?: boolean; banio?: boolean }) {
              const parts = [`${habitaciones ?? '?'} hab.`, cocina ? 'con cocina' : 'sin cocina', banio ? 'con baño' : 'sin baño'];
              return { title: parts.join(', ') };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'video',
      title: 'Video del modelo',
      type: 'object',
      description: 'URL de YouTube, Vimeo o video directo (.mp4). Se muestra antes que las fotos.',
      fields: [
        defineField({
          name: 'url',
          title: 'URL del video',
          type: 'url',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'label',
          title: 'Etiqueta',
          type: 'string',
          initialValue: 'Video del modelo',
        }),
      ],
    }),
    defineField({
      name: 'virtualTour',
      title: 'Tour virtual 360° (URL)',
      type: 'url',
      description: 'URL de Matterport, Google Street View u otro recorrido virtual embebible.',
    }),
    defineField({
      name: 'specs',
      title: 'Especificaciones técnicas',
      type: 'object',
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
    defineField({
      name: 'order',
      title: 'Orden en el catálogo',
      type: 'number',
      description: 'Menor número = aparece primero',
      initialValue: 99,
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
