import { defineField, defineType, defineArrayMember } from 'sanity'

export const quienesSomosType = defineType({
  name: 'quienesSomos',
  title: 'Quiénes somos',
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
          initialValue: 'Construimos hogares, no solo estructuras.',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 3,
          initialValue:
            'Somos un equipo apasionado por la arquitectura modular y el acceso a la vivienda digna. Más de 8 años transformando terrenos vacíos en hogares.',
        }),
      ],
    }),
    defineField({
      name: 'historia',
      title: 'Historia (texto enriquecido)',
      type: 'blockContent',
    }),
    defineField({
      name: 'vision',
      title: 'Visión',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'mision',
      title: 'Misión',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'equipo',
      title: 'Equipo',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Nombre', type: 'string' }),
            defineField({ name: 'role', title: 'Rol / Cargo', type: 'string' }),
            defineField({ name: 'bio', title: 'Biografía', type: 'text', rows: 4 }),
            defineField({
              name: 'photo',
              title: 'Foto',
              type: 'image',
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'role', media: 'photo' },
          },
        }),
      ],
    }),
    defineField({
      name: 'valores',
      title: 'Valores',
      type: 'array',
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
  preview: {
    prepare() {
      return { title: 'Quiénes somos' }
    },
  },
})
