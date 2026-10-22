import { defineField, defineType, defineArrayMember } from 'sanity'
import { QUIENES_SOMOS_DEFAULTS as D } from '../../data/quienes-somos'

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
          initialValue: D.hero.title,
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 3,
          initialValue: D.hero.subtitle,
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
          initialValue: D.historia.title,
        }),
        defineField({
          name: 'content',
          title: 'Contenido (texto enriquecido con imágenes)',
          type: 'blockContent',
          initialValue: D.historia.content,
        }),
      ],
    }),

    // ── Presencia (entre Historia y Misión/Visión) ──────────
    defineField({
      name: 'presencia',
      title: 'Presencia',
      type: 'object',
      group: 'contenido',
      fields: [
        defineField({
          name: 'title',
          title: 'Título de la sección',
          type: 'string',
          initialValue: D.presencia.title,
        }),
        defineField({
          name: 'bloques',
          title: 'Bloques',
          type: 'array',
          description: 'Tres bloques: en columnas en desktop, apilados en el celular.',
          validation: (rule) => rule.max(3),
          initialValue: D.presencia.bloques,
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'subtitulo', title: 'Subtítulo', type: 'string' }),
                defineField({ name: 'texto', title: 'Texto', type: 'text', rows: 5 }),
              ],
              preview: { select: { title: 'subtitulo', subtitle: 'texto' } },
            }),
          ],
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
          initialValue: D.mision.title,
        }),
        defineField({
          name: 'text',
          title: 'Texto',
          type: 'text',
          rows: 4,
          initialValue: D.mision.text,
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
          initialValue: D.vision.title,
        }),
        defineField({
          name: 'text',
          title: 'Texto',
          type: 'text',
          rows: 4,
          initialValue: D.vision.text,
        }),
      ],
    }),

    // ── Valores ──────────────────────────────────────────────
    defineField({
      name: 'valores',
      title: 'Valores',
      type: 'array',
      group: 'equipo',
      initialValue: D.valores,
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
      description: 'Oculto: esta sección no se muestra en el sitio aunque tenga datos.',
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
