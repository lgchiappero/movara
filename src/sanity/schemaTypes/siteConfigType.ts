import { defineField, defineType } from 'sanity'

export const siteConfigType = defineType({
  name: 'siteConfig',
  title: 'Configuración del sitio',
  type: 'document',
  groups: [
    { name: 'contacto', title: 'Contacto' },
    { name: 'seo', title: 'SEO y marca' },
  ],
  fields: [
    defineField({
      name: 'whatsappNumber',
      title: 'Número de WhatsApp',
      type: 'string',
      description: 'Sin espacios ni símbolos. Ej: 5491100000000',
      group: 'contacto',
    }),
    defineField({
      name: 'email',
      title: 'Email de contacto',
      type: 'string',
      group: 'contacto',
    }),
    defineField({
      name: 'phone',
      title: 'Teléfono visible',
      type: 'string',
      description: 'Ej: +54 9 11 0000-0000',
      group: 'contacto',
    }),
    defineField({
      name: 'address',
      title: 'Dirección',
      type: 'string',
      group: 'contacto',
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram URL',
      type: 'url',
      group: 'contacto',
    }),
    defineField({
      name: 'linkedin',
      title: 'LinkedIn URL',
      type: 'url',
      group: 'contacto',
    }),
    defineField({
      name: 'businessHours',
      title: 'Horario comercial',
      type: 'string',
      description: 'Ej: Lunes a viernes de 9 a 18 hs',
      initialValue: 'Lunes a viernes de 9 a 18 hs',
      group: 'contacto',
    }),
    defineField({
      name: 'metaTitle',
      title: 'Meta título (SEO)',
      type: 'string',
      description: 'Título que aparece en Google y en la pestaña del navegador.',
      initialValue: 'MOVARA — Casas Modulares de Calidad',
      group: 'seo',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta descripción (SEO)',
      type: 'text',
      rows: 3,
      description: 'Descripción corta (150–160 caracteres) para Google.',
      initialValue:
        'Diseñamos, fabricamos y entregamos casas modulares sustentables en toda la Argentina. Llave en mano.',
      group: 'seo',
    }),
    defineField({
      name: 'logo',
      title: 'Logo del sitio',
      type: 'image',
      options: { hotspot: false },
      group: 'seo',
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      description: 'Icono cuadrado de al menos 32×32 px.',
      options: { hotspot: false },
      group: 'seo',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Configuración del sitio' }
    },
  },
})
