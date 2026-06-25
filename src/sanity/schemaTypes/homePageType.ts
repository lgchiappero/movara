import { defineField, defineType, defineArrayMember } from 'sanity'

export const homePageType = defineType({
  name: 'homePage',
  title: 'Landing Premium',
  type: 'document',
  fields: [
    // ─── 1. HERO ────────────────────────────────────────────────────────────
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        defineField({
          name: 'badgePreventa',
          title: 'Badge superior (preventa)',
          type: 'string',
          initialValue: 'Preventa activa — Acceso prioritario limitado',
        }),
        defineField({
          name: 'titulo',
          title: 'Título (línea 1 y 2)',
          type: 'string',
          description: 'Ej: "Infraestructura habitacional premium."',
          initialValue: 'Infraestructura habitacional premium.',
        }),
        defineField({
          name: 'tituloDestacado',
          title: 'Título destacado (línea dorada)',
          type: 'string',
          initialValue: 'Lista en semanas.',
        }),
        defineField({
          name: 'subtitulo',
          title: 'Subtítulo',
          type: 'text',
          rows: 3,
          initialValue:
            'Las primeras unidades MOVARA están disponibles con condiciones exclusivas de preventa. Estamos habilitando acceso prioritario a clientes seleccionados antes de la apertura oficial.',
        }),
        defineField({
          name: 'ctaPrimario',
          title: 'CTA primario (botón dorado)',
          type: 'string',
          initialValue: 'Quiero acceso prioritario',
        }),
        defineField({
          name: 'ctaSecundario',
          title: 'CTA secundario (ghost)',
          type: 'string',
          initialValue: 'Reservar precio de lanzamiento',
        }),
        defineField({
          name: 'trustStrip',
          title: 'Trust strip (specs técnicas)',
          type: 'array',
          description: 'Los 4 ítems técnicos del strip inferior del hero',
          of: [defineArrayMember({ type: 'string' })],
          initialValue: [
            'Estructura certificada CE',
            'Lana de roca 75mm',
            'DVH con RPT',
            'Producción nacional',
          ],
        }),
      ],
    }),

    // ─── 2. PREVENTA ────────────────────────────────────────────────────────
    defineField({
      name: 'preventa',
      title: 'Preventa / Acceso prioritario',
      type: 'object',
      fields: [
        defineField({
          name: 'badgeEscasez',
          title: 'Badge escasez',
          type: 'string',
          initialValue: 'Preventa activa',
        }),
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'Primeras 20 unidades\nen condiciones de lanzamiento.',
        }),
        defineField({
          name: 'subtitulo',
          title: 'Subtítulo',
          type: 'text',
          rows: 3,
          initialValue:
            'Las condiciones de preventa no estarán disponibles para siempre. Una vez agotadas, el precio y los tiempos de entrega serán los del mercado abierto.',
        }),
        defineField({
          name: 'totalUnidades',
          title: 'Total de unidades en preventa',
          type: 'number',
          initialValue: 20,
        }),
        defineField({
          name: 'unidadesReservadas',
          title: 'Unidades ya reservadas',
          type: 'number',
          initialValue: 7,
        }),
        defineField({
          name: 'textoCierre',
          title: 'Texto CTA',
          type: 'string',
          initialValue: 'Quiero entrar en preventa',
        }),
        defineField({
          name: 'beneficios',
          title: 'Beneficios de la preventa (3 cards)',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'titulo', title: 'Título', type: 'string' }),
                defineField({ name: 'descripcion', title: 'Descripción', type: 'text', rows: 2 }),
              ],
              preview: { select: { title: 'titulo' } },
            }),
          ],
        }),
      ],
    }),

    // ─── 3. DOSSIER (lead magnet) ────────────────────────────────────────────
    defineField({
      name: 'dossier',
      title: 'Dossier privado (Lead magnet)',
      type: 'object',
      fields: [
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'Accedé al dossier exclusivo MOVARA.',
        }),
        defineField({
          name: 'subtitulo',
          title: 'Subtítulo',
          type: 'text',
          rows: 3,
          initialValue:
            'Solo para clientes seleccionados. Completá el formulario y un asesor MOVARA se comunica con vos en menos de 2 horas hábiles.',
        }),
        defineField({
          name: 'items',
          title: 'Ítems incluidos en el dossier',
          type: 'array',
          of: [defineArrayMember({ type: 'string' })],
          initialValue: [
            'Modelos completos con planos y especificaciones técnicas',
            'Configuraciones premium y opciones de personalización',
            'Comparativa técnica vs. construcción tradicional',
            'Escenarios de inversión Airbnb con proyección de ROI',
            'Condiciones exclusivas de preventa y lanzamiento',
            'Acceso a asesoramiento privado con nuestro equipo',
          ],
        }),
        defineField({
          name: 'textoCTA',
          title: 'Texto botón',
          type: 'string',
          initialValue: 'Quiero el dossier privado',
        }),
      ],
    }),

    // ─── 4. NUEVA CATEGORÍA (propuesta de valor comparativa) ────────────────
    defineField({
      name: 'nuevaCategoria',
      title: 'Propuesta de valor — comparativa',
      type: 'object',
      fields: [
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'MOVARA no entra en ninguna categoría que ya conocés.',
        }),
        defineField({
          name: 'subtitulo',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue: 'Es una nueva forma de pensar la infraestructura habitacional en Argentina.',
        }),
        defineField({
          name: 'cita',
          title: 'Cita final',
          type: 'string',
          initialValue: '"No estamos compitiendo con la construcción tradicional. Estamos reemplazándola."',
        }),
        defineField({
          name: 'columnas',
          title: 'Columnas (máx. 3)',
          type: 'array',
          validation: (Rule) => Rule.max(3),
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'titulo', title: 'Título de la columna', type: 'string' }),
                defineField({ name: 'descripcion', title: 'Descripción', type: 'text', rows: 3 }),
                defineField({
                  name: 'destacado',
                  title: '¿Columna destacada? (fondo oscuro/dorado)',
                  type: 'boolean',
                  initialValue: false,
                }),
                defineField({
                  name: 'tachado',
                  title: '¿Título con tachado? (negaciones)',
                  type: 'boolean',
                  initialValue: false,
                }),
              ],
              preview: {
                select: { title: 'titulo', subtitle: 'destacado' },
                prepare: ({ title, subtitle }) => ({
                  title,
                  subtitle: subtitle ? '★ Destacada' : '',
                }),
              },
            }),
          ],
        }),
      ],
    }),

    // ─── 5. DOLOR CONSTRUCCIÓN TRADICIONAL ──────────────────────────────────
    defineField({
      name: 'dolorConvencional',
      title: 'Dolor — construcción tradicional',
      type: 'object',
      fields: [
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'La construcción tradicional está rota.',
        }),
        defineField({
          name: 'subtitulo',
          title: 'Subtítulo (frase introductoria)',
          type: 'text',
          rows: 2,
          initialValue:
            'Cada obra en Argentina termina siendo un proyecto de gestión de crisis. No de construcción.',
        }),
        defineField({
          name: 'stats',
          title: 'Estadísticas (grid 4)',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'stat', title: 'Valor / cifra', type: 'string' }),
                defineField({ name: 'label', title: 'Etiqueta', type: 'string' }),
                defineField({ name: 'sub', title: 'Descripción secundaria', type: 'string' }),
              ],
              preview: { select: { title: 'stat', subtitle: 'label' } },
            }),
          ],
        }),
        defineField({
          name: 'problemas',
          title: 'Problemas (cards de dolor)',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'titulo', title: 'Título', type: 'string' }),
                defineField({ name: 'descripcion', title: 'Descripción', type: 'text', rows: 2 }),
              ],
              preview: { select: { title: 'titulo' } },
            }),
          ],
        }),
        defineField({
          name: 'separador',
          title: 'Texto separador (debajo de los problemas)',
          type: 'string',
          initialValue: 'MOVARA existe para que esto no te pase a vos.',
        }),
      ],
    }),

    // ─── 6. PARA QUIÉN ES MOVARA ─────────────────────────────────────────────
    defineField({
      name: 'paraQuien',
      title: 'Para quién es MOVARA',
      type: 'object',
      fields: [
        defineField({
          name: 'titulo',
          title: 'Título de sección',
          type: 'string',
          initialValue: '¿Para quién es MOVARA?',
        }),
        defineField({
          name: 'avatares',
          title: 'Perfiles / Avatares',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'icono', title: 'Ícono (emoji)', type: 'string' }),
                defineField({ name: 'titulo', title: 'Título', type: 'string' }),
                defineField({ name: 'descripcion', title: 'Descripción', type: 'text', rows: 2 }),
                defineField({ name: 'cta', title: 'Texto CTA (botón)', type: 'string' }),
              ],
              preview: {
                select: { title: 'titulo', subtitle: 'icono' },
              },
            }),
          ],
        }),
      ],
    }),

    // ─── 7. CÓMO FUNCIONA ────────────────────────────────────────────────────
    defineField({
      name: 'comoFunciona',
      title: 'Cómo funciona',
      type: 'object',
      fields: [
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'De la idea al espacio en 4 pasos',
        }),
        defineField({
          name: 'pasos',
          title: 'Pasos (máx. 4)',
          type: 'array',
          validation: (Rule) => Rule.max(4),
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'titulo', title: 'Título del paso', type: 'string' }),
                defineField({ name: 'descripcion', title: 'Descripción', type: 'text', rows: 2 }),
              ],
              preview: { select: { title: 'titulo' } },
            }),
          ],
        }),
      ],
    }),

    // ─── MODELOS HOME (header + datos de preventa) ──────────────────────────
    defineField({
      name: 'modelosHome',
      title: 'Sección modelos (landing)',
      type: 'object',
      description: 'Los datos de cada modelo vienen del documento "Modelo" en Sanity. Aquí se edita el encabezado de la sección.',
      fields: [
        defineField({
          name: 'badgeSeccion',
          title: 'Badge de sección',
          type: 'string',
          initialValue: 'Línea de productos — Edición Fundadores',
        }),
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'Tres modelos. Un estándar.',
        }),
        defineField({
          name: 'badgePreventa',
          title: 'Badge de preventa (chip derecho)',
          type: 'string',
          initialValue: '⚡ Condiciones de preventa activas',
        }),
        defineField({
          name: 'ctaReservar',
          title: 'Texto botón "Reservar"',
          type: 'string',
          initialValue: 'Reservar precio',
        }),
        defineField({
          name: 'ctaCatalogo',
          title: 'Texto link catálogo completo',
          type: 'string',
          initialValue: 'Ver catálogo completo →',
        }),
      ],
    }),

    // ─── PRUEBA SOCIAL ────────────────────────────────────────────────────────
    defineField({
      name: 'pruebaSocial',
      title: 'Prueba social / Estándar técnico',
      type: 'object',
      fields: [
        defineField({
          name: 'badgeSeccion',
          title: 'Badge de sección (label dorado)',
          type: 'string',
          initialValue: 'Estándar técnico',
        }),
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'Calidad que podés verificar',
        }),
        defineField({
          name: 'badges',
          title: 'Badges de calidad',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'icono', title: 'Ícono (emoji)', type: 'string' }),
                defineField({ name: 'label', title: 'Etiqueta', type: 'string' }),
              ],
              preview: { select: { title: 'label', subtitle: 'icono' } },
            }),
          ],
        }),
        defineField({
          name: 'showroomTitulo',
          title: 'Título del banner showroom',
          type: 'string',
          initialValue: 'Showroom próximamente en Sunchales, Santa Fe',
        }),
        defineField({
          name: 'showroomDesc',
          title: 'Descripción del banner showroom',
          type: 'text',
          rows: 2,
          initialValue:
            'Vas a poder recorrer un modelo real, tocar los materiales y hablar con nuestro equipo.',
        }),
        defineField({
          name: 'showroomChip',
          title: 'Chip del showroom',
          type: 'string',
          initialValue: 'Próximamente',
        }),
      ],
    }),

    // ─── 8. FORMULARIO DE CONTACTO ───────────────────────────────────────────
    defineField({
      name: 'formularioContacto',
      title: 'Formulario de leads calificado',
      type: 'object',
      fields: [
        defineField({
          name: 'titulo',
          title: 'Título',
          type: 'string',
          initialValue: 'Hablá con un asesor MOVARA.',
        }),
        defineField({
          name: 'subtitulo',
          title: 'Subtítulo',
          type: 'text',
          rows: 2,
          initialValue:
            'Respuesta en menos de 2 horas en horario comercial. Sin presión, con toda la información.',
        }),
        defineField({
          name: 'textoCTA',
          title: 'Texto botón enviar',
          type: 'string',
          initialValue: 'Solicitar asesoramiento privado',
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Landing Premium MOVARA' }
    },
  },
})
