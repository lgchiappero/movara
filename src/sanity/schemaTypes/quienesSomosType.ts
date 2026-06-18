import { defineField, defineType, defineArrayMember } from 'sanity'

export const quienesSomosType = defineType({
  name: 'quienesSomos',
  title: 'Quiénes somos',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero' },
    { name: 'contenido', title: 'Contenido' },
    { name: 'equipo', title: 'Equipo y valores' },
  ],
  fields: [
    // ── Hero ────────────────────────────────────────────────
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
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
        defineField({
          name: 'backgroundImage',
          title: 'Imagen de fondo',
          type: 'image',
          description: 'Opcional. Se muestra detrás del texto del hero con overlay oscuro.',
          options: { hotspot: true },
        }),
      ],
    }),

    // ── Historia ─────────────────────────────────────────────
    defineField({
      name: 'historia',
      title: 'Historia',
      type: 'object',
      group: 'contenido',
      fields: [
        defineField({
          name: 'title',
          title: 'Título de la sección',
          type: 'string',
          initialValue: 'Nuestra historia',
        }),
        defineField({
          name: 'content',
          title: 'Contenido (texto enriquecido con imágenes)',
          type: 'blockContent',
        }),
      ],
    }),

    // ── Misión ───────────────────────────────────────────────
    defineField({
      name: 'mision',
      title: 'Misión',
      type: 'object',
      group: 'contenido',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: 'Misión',
        }),
        defineField({
          name: 'text',
          title: 'Texto',
          type: 'text',
          rows: 4,
        }),
      ],
    }),

    // ── Visión ───────────────────────────────────────────────
    defineField({
      name: 'vision',
      title: 'Visión',
      type: 'object',
      group: 'contenido',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: 'Visión',
        }),
        defineField({
          name: 'text',
          title: 'Texto',
          type: 'text',
          rows: 4,
        }),
      ],
    }),

    // ── Valores ──────────────────────────────────────────────
    defineField({
      name: 'valores',
      title: 'Valores',
      type: 'array',
      group: 'equipo',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'icon',
              title: 'Ícono (emoji)',
              type: 'string',
              description: 'Ej: 🏗️ 🤝 🌱 💡',
            }),
            defineField({ name: 'title', title: 'Título', type: 'string' }),
            defineField({ name: 'description', title: 'Descripción', type: 'text', rows: 3 }),
          ],
          preview: {
            select: { title: 'icon', subtitle: 'title' },
          },
        }),
      ],
    }),

    // ── Equipo ───────────────────────────────────────────────
    defineField({
      name: 'equipo',
      title: 'Equipo',
      type: 'array',
      group: 'equipo',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'photo',
              title: 'Foto',
              type: 'image',
              options: { hotspot: true },
            }),
            defineField({ name: 'name', title: 'Nombre', type: 'string' }),
            defineField({ name: 'role', title: 'Cargo', type: 'string' }),
            defineField({
              name: 'bio',
              title: 'Descripción corta',
              type: 'text',
              rows: 3,
            }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'role', media: 'photo' },
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
