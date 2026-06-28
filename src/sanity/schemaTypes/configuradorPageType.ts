import { defineField, defineType } from 'sanity'

export const configuradorPageType = defineType({
  name: 'configuradorPage',
  title: 'Configurador',
  type: 'document',
  groups: [
    { name: 'paso1', title: 'Paso 1 — Modelo' },
    { name: 'paso2', title: 'Paso 2 — Finalidad' },
    { name: 'paso3', title: 'Paso 3 — Ubicación' },
    { name: 'resultado', title: 'Resultado' },
  ],
  fields: [
    // ── Paso 1 ──────────────────────────────────────────────
    defineField({
      name: 'paso1',
      title: 'Paso 1 — Modelo',
      type: 'object',
      group: 'paso1',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: '¿Qué tamaño necesitás?',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue: 'Cada unidad MOVARA es una estructura modular de alta prestación. Elegí según tu proyecto.',
        }),
        defineField({
          name: 'modelo10ft',
          title: 'Tagline — MOVARA 10ft (18m²)',
          type: 'string',
          initialValue: 'Studio, espacio mínimo o módulo independiente',
        }),
        defineField({
          name: 'modelo20ft',
          title: 'Tagline — MOVARA 20ft (37m²)',
          type: 'string',
          initialValue: 'El más versátil — 1 o 2 ambientes',
        }),
        defineField({
          name: 'modelo40ft',
          title: 'Tagline — MOVARA 40ft (74m²)',
          type: 'string',
          initialValue: 'Máximo espacio — familia o inversión grande',
        }),
      ],
    }),

    // ── Paso 2 ──────────────────────────────────────────────
    defineField({
      name: 'paso2',
      title: 'Paso 2 — Finalidad',
      type: 'object',
      group: 'paso2',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: '¿Para qué lo vas a usar?',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue: 'El uso define la configuración interior y el tipo de asesoramiento que te damos.',
        }),
        defineField({
          name: 'descInversor',
          title: 'Descripción — Inversor 💰',
          type: 'string',
          initialValue: 'Transformá capital en renta en semanas',
        }),
        defineField({
          name: 'descAgro',
          title: 'Descripción — Agro / Campo 🌾',
          type: 'string',
          initialValue: 'Infraestructura lista para tu campo, sin meses de obra',
        }),
        defineField({
          name: 'descVivienda',
          title: 'Descripción — Primera vivienda 🏠',
          type: 'string',
          initialValue: 'Una nueva forma de habitar',
        }),
        defineField({
          name: 'descTurismo',
          title: 'Descripción — Turismo 🏕️',
          type: 'string',
          initialValue: 'Eco resort, glamping o expansión rápida',
        }),
        defineField({
          name: 'descEmpresa',
          title: 'Descripción — Empresa / B2B 💼',
          type: 'string',
          initialValue: 'Oficinas, campamentos o infraestructura corporativa',
        }),
        defineField({
          name: 'descSectorPublico',
          title: 'Descripción — Sector público 🏛️',
          type: 'string',
          initialValue: 'Vivienda social o infraestructura municipal',
        }),
      ],
    }),

    // ── Paso 3 ──────────────────────────────────────────────
    defineField({
      name: 'paso3',
      title: 'Paso 3 — Ubicación',
      type: 'object',
      group: 'paso3',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: '¿Dónde lo instalás?',
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue:
            'Cada zona del país tiene requerimientos técnicos distintos. Los calculamos automáticamente.',
        }),
        defineField({
          name: 'localidadLabel',
          title: 'Label campo Localidad',
          type: 'string',
          initialValue: 'Localidad',
        }),
        defineField({
          name: 'provinciaLabel',
          title: 'Label campo Provincia',
          type: 'string',
          initialValue: 'Provincia',
        }),
      ],
    }),

    // ── Resultado ───────────────────────────────────────────
    defineField({
      name: 'resultado',
      title: 'Pantalla de Resultado',
      type: 'object',
      group: 'resultado',
      fields: [
        defineField({
          name: 'title',
          title: 'Título',
          type: 'string',
          initialValue: 'Listo. Así queda tu MOVARA.',
        }),
        defineField({
          name: 'waButtonText',
          title: 'Texto botón WhatsApp',
          type: 'string',
          initialValue: 'Enviar por WhatsApp',
        }),
        defineField({
          name: 'trustText',
          title: 'Texto de confianza bajo el botón',
          type: 'string',
          initialValue: 'Sin cargo. Respondemos en menos de 2 horas.',
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Configurador' }
    },
  },
})
