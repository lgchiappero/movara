import { defineField, defineType, defineArrayMember } from 'sanity'

export const homePageType = defineType({
  name: 'homePage',
  title: 'Página de inicio',
  type: 'document',
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        defineField({
          name: 'badgeText',
          title: 'Texto del badge',
          type: 'string',
          initialValue: 'Fabricación 100% argentina',
        }),
        defineField({
          name: 'title',
          title: 'Título principal',
          type: 'string',
          initialValue: 'Tu casa, en 60 días. Sin obra.',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 3,
          initialValue:
            'Casas modulares llave en mano. Diseñadas y fabricadas en planta, instaladas en tu terreno. Calidad superior, precio justo, entrega garantizada por contrato.',
        }),
        defineField({
          name: 'ctaPrimaryText',
          title: 'Botón principal',
          type: 'string',
          initialValue: 'Ver modelos',
        }),
        defineField({
          name: 'ctaSecondaryText',
          title: 'Botón secundario',
          type: 'string',
          initialValue: 'Consultar por WhatsApp',
        }),
        defineField({
          name: 'stats',
          title: 'Estadísticas',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'value', title: 'Valor', type: 'string' }),
                defineField({ name: 'label', title: 'Etiqueta', type: 'string' }),
              ],
              preview: {
                select: { title: 'value', subtitle: 'label' },
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'whyMovara',
      title: 'Sección "Por qué MOVARA"',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: '4 pilares que nos diferencian',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue:
            'Más de 8 años construyendo casas modulares nos enseñaron que la confianza se gana con hechos, no con promesas.',
        }),
        defineField({
          name: 'pillars',
          title: 'Pilares (máx. 4, el orden se respeta)',
          type: 'array',
          validation: (Rule) => Rule.max(4),
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'title', title: 'Título', type: 'string' }),
                defineField({ name: 'description', title: 'Descripción', type: 'text', rows: 3 }),
              ],
              preview: {
                select: { title: 'title' },
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'usos',
      title: 'Sección Usos y Perfiles',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: 'Una solución para cada proyecto',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue: 'Nuestros modelos se adaptan a distintos objetivos. ¿En cuál te ves?',
        }),
        defineField({
          name: 'items',
          title: 'Usos',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'emoji', title: 'Emoji', type: 'string' }),
                defineField({ name: 'category', title: 'Categoría (label pequeño)', type: 'string' }),
                defineField({ name: 'title', title: 'Título', type: 'string' }),
                defineField({ name: 'description', title: 'Descripción', type: 'text', rows: 3 }),
                defineField({
                  name: 'href',
                  title: 'Enlace',
                  type: 'string',
                  description: 'Ruta interna. Ej: /modelos',
                }),
                defineField({ name: 'statValue', title: 'Valor estadística', type: 'string' }),
                defineField({ name: 'statLabel', title: 'Etiqueta estadística', type: 'string' }),
              ],
              preview: {
                select: { title: 'category', subtitle: 'title' },
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'process',
      title: 'Sección Proceso',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: 'Simple. Transparente. Sin sorpresas.',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue:
            'Cuatro pasos desde que elegís hasta que recibís las llaves. En promedio, 60 a 90 días corridos.',
        }),
        defineField({
          name: 'steps',
          title: 'Pasos (máx. 4, el ícono se asigna por posición)',
          type: 'array',
          validation: (Rule) => Rule.max(4),
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'title', title: 'Título del paso', type: 'string' }),
                defineField({ name: 'description', title: 'Descripción', type: 'text', rows: 3 }),
              ],
              preview: {
                select: { title: 'title' },
              },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'cta',
      title: 'Sección CTA Final',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: '¿Listo para dar el primer paso?',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue:
            'Sin compromisos. En una primera charla entendemos tu proyecto, te orientamos en modelos y te damos una idea de costos sin vueltas.',
        }),
        defineField({
          name: 'ctaText',
          title: 'Texto del botón WhatsApp',
          type: 'string',
          initialValue: 'Consultar por WhatsApp',
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Página de inicio' }
    },
  },
})
