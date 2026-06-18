import { defineField, defineType } from 'sanity'

export const modelosPageType = defineType({
  name: 'modelosPage',
  title: 'Página de Modelos',
  type: 'document',
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: 'Catálogo de modelos',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue:
            'Cada modelo está diseñado para adaptarse a tu proyecto y región. Todos incluyen fabricación, transporte e instalación.',
        }),
      ],
    }),
    defineField({
      name: 'introText',
      title: 'Texto introductorio',
      type: 'text',
      rows: 4,
      description: 'Párrafo de introducción que aparece antes del listado de modelos.',
      initialValue:
        'Nuestros módulos están fabricados en planta con materiales de primera línea. Podés personalizarlos en distribución, terminaciones y equipamiento según tu proyecto.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Página de Modelos' }
    },
  },
})
