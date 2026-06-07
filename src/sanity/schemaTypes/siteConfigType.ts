import { defineField, defineType } from 'sanity'

export const siteConfigType = defineType({
  name: 'siteConfig',
  title: 'Configuración del sitio',
  type: 'document',
  fields: [
    defineField({
      name: 'whatsappNumber',
      title: 'Número de WhatsApp',
      type: 'string',
      description: 'Sin espacios ni símbolos. Ej: 5491100000000',
    }),
    defineField({
      name: 'email',
      title: 'Email de contacto',
      type: 'string',
    }),
    defineField({
      name: 'phone',
      title: 'Teléfono visible',
      type: 'string',
      description: 'Ej: +54 9 11 0000-0000',
    }),
    defineField({
      name: 'address',
      title: 'Dirección',
      type: 'string',
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram URL',
      type: 'url',
    }),
    defineField({
      name: 'linkedin',
      title: 'LinkedIn URL',
      type: 'url',
    }),
    defineField({
      name: 'businessHours',
      title: 'Horario comercial',
      type: 'string',
      description: 'Ej: Lunes a viernes de 9 a 18 hs',
      initialValue: 'Lunes a viernes de 9 a 18 hs',
    }),
  ],
  preview: {
    select: { title: 'whatsappNumber' },
    prepare() {
      return { title: 'Configuración del sitio' }
    },
  },
})
