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
      name: 'category',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          { title: 'Vivienda familiar', value: 'familiar' },
          { title: 'Alquiler turístico', value: 'turistico' },
          { title: 'Oficina en casa', value: 'oficina' },
        ],
      },
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
