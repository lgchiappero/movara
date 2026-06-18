import { defineField, defineType, defineArrayMember } from 'sanity'

export const siteConfigType = defineType({
  name: 'siteConfig',
  title: 'Configuración del sitio',
  type: 'document',
  groups: [
    { name: 'contacto', title: 'Contacto' },
    { name: 'footer', title: 'Footer' },
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
      name: 'whatsappHorario',
      title: 'Horario WhatsApp',
      type: 'string',
      description: 'Ej: Lun a Vie 9 a 18hs',
      initialValue: 'Lun a Vie 9 a 18hs',
      group: 'contacto',
    }),
    defineField({
      name: 'whatsappRespuesta',
      title: 'Tiempo de respuesta WhatsApp',
      type: 'string',
      description: 'Ej: Respondemos en menos de 2 horas',
      initialValue: 'Respondemos en menos de 2 horas',
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
    // ── Footer ──────────────────────────────────────────────
    defineField({
      name: 'footerDescription',
      title: 'Descripción de la marca (footer)',
      type: 'text',
      rows: 3,
      description: 'Párrafo corto que aparece debajo del logo en el footer.',
      initialValue:
        'Estamos repensando la forma de habitar. Casas modulares de calidad superior, fabricación argentina.',
      group: 'footer',
    }),
    defineField({
      name: 'footerNavLinks',
      title: 'Links de navegación',
      type: 'array',
      description: 'Links que aparecen en la columna de navegación del footer.',
      group: 'footer',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Texto del link',
              type: 'string',
            }),
            defineField({
              name: 'url',
              title: 'URL',
              type: 'string',
              description: 'Ruta interna (ej: /modelos) o URL completa.',
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        }),
      ],
    }),
    defineField({
      name: 'copyrightText',
      title: 'Texto de copyright',
      type: 'string',
      description: 'Aparece en la barra inferior del footer.',
      initialValue: 'MOVARA. Todos los derechos reservados.',
      group: 'footer',
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
