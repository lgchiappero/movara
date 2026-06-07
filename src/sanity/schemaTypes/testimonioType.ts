import { defineField, defineType } from 'sanity'

export const testimonioType = defineType({
  name: 'testimonio',
  title: 'Testimonio',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Testimonio',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required().min(40),
    }),
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'rol',
      title: 'Rol / Tipo de uso',
      type: 'string',
      description: 'Ej: Vivienda familiar · Córdoba',
    }),
    defineField({
      name: 'ciudad',
      title: 'Ciudad',
      type: 'string',
    }),
    defineField({
      name: 'isFeatured',
      title: '¿Destacado?',
      type: 'boolean',
      description: 'El testimonio destacado ocupa el lugar principal (más grande)',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Orden',
      type: 'number',
      initialValue: 99,
    }),
  ],
  preview: {
    select: {
      title: 'nombre',
      subtitle: 'rol',
    },
  },
})
