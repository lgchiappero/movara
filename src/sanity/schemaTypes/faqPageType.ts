import { defineField, defineType, defineArrayMember } from 'sanity'

export const faqPageType = defineType({
  name: 'faqPage',
  title: 'Preguntas Frecuentes (FAQ)',
  type: 'document',
  fields: [
    defineField({
      name: 'categorias',
      title: 'Categorías',
      type: 'array',
      description: 'Cada categoría agrupa un set de preguntas y respuestas. Las primeras 3 preguntas de cada categoría son las que se muestran en el home.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'categoria',
          fields: [
            defineField({
              name: 'titulo',
              title: 'Título de la categoría',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'icono',
              title: 'Ícono (emoji)',
              type: 'string',
              description: 'Ej: 🏠 🔧 💰 🔥 📋',
            }),
            defineField({
              name: 'preguntas',
              title: 'Preguntas',
              type: 'array',
              validation: (Rule) => Rule.required().min(1),
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'pregunta',
                  fields: [
                    defineField({
                      name: 'pregunta',
                      title: 'Pregunta',
                      type: 'string',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'respuesta',
                      title: 'Respuesta',
                      type: 'text',
                      rows: 4,
                      validation: (Rule) => Rule.required(),
                    }),
                  ],
                  preview: {
                    select: { title: 'pregunta' },
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { title: 'titulo', subtitle: 'icono', preguntas: 'preguntas' },
            prepare: ({ title, subtitle, preguntas }) => ({
              title: subtitle ? `${subtitle} ${title ?? ''}` : title,
              subtitle: `${preguntas?.length ?? 0} pregunta(s)`,
            }),
          },
        }),
      ],
      initialValue: [
        {
          titulo: 'Sobre el producto',
          icono: '🏠',
          preguntas: [
            {
              pregunta: '¿Qué es una unidad MOVARA? ¿Es lo mismo que un container?',
              respuesta:
                'No. Una unidad MOVARA es infraestructura habitacional modular de acero certificado, diseñada específicamente para ser habitada. No es un container adaptado — tiene aislación de lana de roca 75mm, aberturas con doble vidrio y rotura de puente térmico, sistema eléctrico certificado CE y terminaciones de calidad. Es un producto industrializado de precisión, no una adaptación.',
            },
            {
              pregunta: '¿Cuánto dura una unidad MOVARA?',
              respuesta:
                'La estructura de acero Q235B tiene una vida útil estimada de 50 años con mantenimiento básico. La pintura exterior y los sellados perimetrales requieren revisión cada 8-10 años dependiendo del clima.',
            },
            {
              pregunta: '¿Se puede conectar con otra unidad o ampliar?',
              respuesta:
                'Sí. El sistema modular permite conectar múltiples unidades para crear espacios más grandes. Consultanos para evaluar la configuración según tu necesidad.',
            },
          ],
        },
        {
          titulo: 'Sobre la instalación',
          icono: '🔧',
          preguntas: [
            {
              pregunta: '¿Necesito hacer obra civil para instalarla?',
              respuesta:
                'Necesitás una base o fundación básica — puede ser una platea de hormigón, vigas de nivel o pilotes dependiendo del terreno. No necesitás obra tradicional. El tiempo de preparación del terreno es mínimo comparado con una construcción convencional.',
            },
            {
              pregunta: '¿Qué necesito en mi terreno para recibirla?',
              respuesta:
                'Terreno nivelado, acceso para camión con grúa (mínimo 4 metros de ancho) y una base de apoyo. Te asesoramos en cada caso según tu ubicación y terreno.',
            },
            {
              pregunta: '¿Cuánto tarda la instalación una vez que llega la unidad?',
              respuesta:
                'La instalación de la unidad en el terreno tarda entre 1 y 3 días dependiendo de la complejidad. Las conexiones de servicios (electricidad, agua, etc.) las gestiona el cliente con sus profesionales.',
            },
            {
              pregunta: '¿Se puede instalar en cualquier provincia de Argentina?',
              respuesta:
                'Sí. Hacemos envíos a todo el país. El costo de transporte varía según la distancia y se cotiza por separado.',
            },
          ],
        },
        {
          titulo: 'Sobre precios y pagos',
          icono: '💰',
          preguntas: [
            {
              pregunta: '¿Cuánto cuesta una unidad MOVARA?',
              respuesta:
                'Los precios varían según el modelo y la configuración. MOVARA 10ft desde USD 15.000, MOVARA 20ft desde USD 22.000 y MOVARA 40ft desde USD 35.000. Estos valores son de referencia — el precio final depende de tu configuración, upgrades y ubicación. Usá el configurador para obtener un presupuesto personalizado.',
            },
            {
              pregunta: '¿Hay financiación disponible?',
              respuesta:
                'Actualmente operamos con preventa. Las condiciones de pago se definen en cada caso. Consultanos para conocer las opciones disponibles.',
            },
            {
              pregunta: '¿Por qué funciona con preventa?',
              respuesta:
                'Porque cada unidad se produce específicamente para vos según tu configuración. No tenemos stock genérico — esto nos permite ofrecerte exactamente lo que necesitás con la calidad que prometemos.',
            },
            {
              pregunta: '¿Qué incluye el precio?',
              respuesta:
                'El precio incluye la unidad completa con todos los upgrades de tu configuración. No incluye: flete hasta tu provincia, descarga, la platea o pilotes, conexiones de servicios ni permisos municipales.',
            },
          ],
        },
        {
          titulo: 'Sobre gas y servicios',
          icono: '🔥',
          preguntas: [
            {
              pregunta: '¿La unidad viene con gas?',
              respuesta:
                'MOVARA no provee artefactos a gas ni instala cañería interna de gas.',
            },
            {
              pregunta: '¿Cómo conecto la electricidad?',
              respuesta:
                'La unidad viene con sistema eléctrico certificado CE completo. Solo necesitás conectarla a la red mediante un electricista matriculado, igual que cualquier vivienda.',
            },
            {
              pregunta: '¿Y el agua?',
              respuesta:
                'La unidad tiene las instalaciones internas de agua. La conexión a la red o a un tanque externo la realiza un plomero — es una conexión simple y estándar.',
            },
          ],
        },
        {
          titulo: 'Sobre permisos',
          icono: '📋',
          preguntas: [
            {
              pregunta: '¿Necesito permiso municipal para instalar una unidad MOVARA?',
              respuesta:
                'Depende del municipio y el uso que le des. En zonas rurales generalmente no se requieren permisos. En zonas urbanas puede requerirse una habilitación. Te recomendamos consultar con tu municipio antes de confirmar la compra — nosotros te asesoramos en el proceso.',
            },
            {
              pregunta: '¿Es legal instalar una casa modular en Argentina?',
              respuesta:
                'Sí. Las construcciones modulares son completamente legales en Argentina. No existe ninguna ley nacional que las prohíba. Las regulaciones varían por municipio y provincia, pero en la práctica la mayoría de los municipios las acepta.',
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Preguntas Frecuentes (FAQ)' }
    },
  },
})
