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
                    defineField({
                      name: 'tabla',
                      title: 'Tabla comparativa (opcional)',
                      type: 'object',
                      description: 'Se muestra debajo de la respuesta. Si una columna se llama "MOVARA", se resalta en dorado.',
                      fields: [
                        defineField({
                          name: 'columnas',
                          title: 'Columnas',
                          type: 'array',
                          of: [{ type: 'string' }],
                        }),
                        defineField({
                          name: 'filas',
                          title: 'Filas',
                          type: 'array',
                          of: [
                            defineArrayMember({
                              type: 'object',
                              name: 'fila',
                              fields: [
                                defineField({
                                  name: 'celdas',
                                  title: 'Celdas',
                                  type: 'array',
                                  of: [{ type: 'string' }],
                                }),
                              ],
                              preview: {
                                select: { celdas: 'celdas' },
                                prepare: ({ celdas }) => ({ title: celdas?.join(' · ') ?? 'Fila' }),
                              },
                            }),
                          ],
                        }),
                      ],
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
                'El precio varía según la configuración — consultanos para tu presupuesto personalizado.',
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
        {
          titulo: 'Calidad',
          icono: '🛡️',
          preguntas: [
            {
              pregunta: '¿Una casa modular es tan resistente como una de material?',
              respuesta:
                'Es más resistente en los puntos que suelen fallar en obra tradicional. La estructura de acero Q235B de MOVARA se calcula con software de ingeniería estructural antes de fabricarse — con 96 combinaciones de carga — algo que rara vez se verifica en una construcción de albañilería. El resultado son márgenes de seguridad muy por encima del mínimo normativo, no solo el cumplimiento justo.',
              tabla: {
                columnas: ['', 'Construcción tradicional', 'MOVARA'],
                filas: [
                  { celdas: ['Cálculo estructural', 'Rara vez se verifica con software', 'Verificado con 96 combinaciones de carga (PKPM)'] },
                  { celdas: ['Margen ante sismo', 'Cumple el mínimo normativo', '12 veces por encima del mínimo normativo'] },
                  { celdas: ['Margen ante viento', 'Cumple el mínimo normativo', '6 veces por encima del mínimo normativo'] },
                  { celdas: ['Uniones estructurales', 'Variable según la mano de obra', '100% soldadas e inspeccionadas por ultrasonido'] },
                ],
              },
            },
            {
              pregunta: '¿El acero no se oxida?',
              respuesta:
                'No, porque nunca queda expuesto: pasa por un sistema de 3 capas de protección industrial aplicado en taller (granallado Sa 2.5 + epoxi rica en zinc + epoxi alto sólido + poliuretano alifático), con un espesor total de 180 a 240 micrones. Cumple la norma ISO 12944 en su clasificación C3-C4, apta para ambientes costeros e industriales, con una durabilidad estimada de 10 a 15 años sin repintar.',
            },
            {
              pregunta: '¿Cómo es el acabado interior? ¿Se ve como un container?',
              respuesta:
                'No. Por dentro no se ve chapa ni estructura expuesta: la última capa del sistema de paredes es un tablero de bambú/madera o acero lacado, igual que un revestimiento interior de una construcción tradicional. El panel de lana de roca 75mm le da a la pared una aislación térmica 4 veces superior y aislación acústica ≥45 dB — muy por encima de una pared de ladrillos común (35-40 dB).',
            },
          ],
        },
        {
          titulo: 'Clima',
          icono: '🌦️',
          preguntas: [
            {
              pregunta: '¿Cómo se comporta en el calor del norte argentino?',
              respuesta:
                'Bien, porque la aislación no es un agregado sino parte de la estructura: paredes con lana de roca 75mm (aislación térmica 4 veces superior a una pared de ladrillos), techo de panel sándwich de poliuretano con sistema de impermeabilización de 5 capas, y ventanas DVH con rotura de puente térmico que evitan la entrada de calor.',
            },
            {
              pregunta: '¿Y en la Patagonia con el frío y el viento?',
              respuesta:
                'La estructura está calculada específicamente para cargas de viento, con un margen de 6 veces por encima del mínimo normativo. Las aberturas DVH con RPT evitan condensación y puentes térmicos, y el panel de lana de roca de las paredes incluye barrera de vapor integrada de fábrica — no es algo que se agrega después según el clima de cada obra.',
            },
            {
              pregunta: '¿Aguanta la lluvia y la humedad del litoral?',
              respuesta:
                'Sí. El sistema anticorrosivo de 3 capas está clasificado para ambientes costeros e industriales (ISO 12944 C3-C4), el techo tiene un sistema de impermeabilización de 5 capas integrado de fábrica y la barrera de vapor integrada en la pared evita que la humedad ambiente condense dentro del panel de lana de roca.',
            },
          ],
        },
        {
          titulo: 'Seguridad',
          icono: '🔒',
          preguntas: [
            {
              pregunta: '¿Qué pasa en un sismo?',
              respuesta:
                'La estructura está verificada para un desplazamiento sísmico de H/742, cuando la norma exige como mínimo H/60 — un margen 12 veces mayor al mínimo normativo. Además, al no tener uniones atornilladas (todo es soldado e inspeccionado por ultrasonido), no hay pernos que puedan aflojarse ante un movimiento sísmico.',
            },
            {
              pregunta: '¿El acero no conduce el calor en caso de incendio?',
              respuesta:
                'El acero estructural no queda expuesto: está envuelto por el panel de lana de roca, material de clasificación de fuego Clase A1 (incombustible) que mantiene su forma hasta 1.000°C y retrasa la transferencia de calor hacia la estructura. Ninguna vivienda es inmune al fuego, pero esto la pone en mejores condiciones que una estructura de madera, que además es combustible en sí misma.',
            },
          ],
        },
        {
          titulo: 'Proceso',
          icono: '⏱️',
          preguntas: [
            {
              pregunta: '¿Cuánto tarda en estar lista?',
              respuesta:
                'La fabricación toma entre 4 y 8 semanas, según el modelo y la configuración. A eso se suma el transporte hasta tu provincia (varía según la distancia) y la instalación en el terreno, que toma entre 1 y 3 días. En total, es un proceso de semanas — no de meses o años como una obra tradicional.',
            },
            {
              pregunta: '¿Necesito hacer obra en el terreno?',
              respuesta:
                'Necesitás una base o fundación básica — puede ser una platea de hormigón, vigas de nivel o pilotes, según tu terreno — más acceso para un camión con grúa. No es obra tradicional: no hay albañilería, no hay meses de plazo, y te asesoramos en cada caso según tu ubicación.',
            },
            {
              pregunta: '¿Qué pasa si algo llega dañado?',
              respuesta:
                'Cada unidad pasa por control de calidad antes de salir de fábrica, incluida la inspección por ultrasonido de las uniones estructurales. Si de todas formas algo se daña durante el transporte, gestionamos el reclamo junto con la transportista — el flete está cubierto por seguro — y coordinamos la solución antes de la entrega final.',
            },
          ],
        },
        {
          titulo: 'Precio',
          icono: '💵',
          preguntas: [
            {
              pregunta: '¿Por qué es más barata que una construcción tradicional?',
              respuesta:
                'Porque se fabrica en planta, en un proceso industrializado y en paralelo — no en un terreno, a la intemperie, con mano de obra artesanal y tiempos que se estiran. En Argentina una obra tradicional pensada para 8 meses tarda en promedio 2.3 años, y esos sobrecostos de tiempo terminan en el precio final. MOVARA tiene precio fijo, sin sorpresas ni imprevistos de obra.',
            },
            {
              pregunta: '¿Tiene financiación?',
              respuesta:
                'Actualmente operamos con preventa: reservás tu unidad a precio de lanzamiento y las condiciones de pago se conversan en cada caso según tu situación. Consultanos por WhatsApp para conocer las opciones disponibles.',
            },
          ],
        },
        {
          titulo: 'MOVARA vs Construcción tradicional',
          icono: '⚖️',
          preguntas: [
            {
              pregunta: '¿Una casa MOVARA es tan sólida como una de material?',
              respuesta:
                'La construcción tradicional de ladrillos en Argentina tiene entre 150 y 200mm de espesor en sus paredes, con una aislación térmica que depende completamente de cómo se hizo la obra. Si salió bien, aísla bien. Si salió mal — y en Argentina muchas veces sale mal — no aísla nada.\n\nUna MOVARA tiene lana de roca de 75mm certificada, con un coeficiente de aislación 4 veces superior a una pared de ladrillos estándar. Sin depender de ningún albañil.\n\nEn cuanto a la estructura: el acero Q235B resiste sismos y vientos por encima del mínimo normativo argentino. La mayoría de las casas de ladrillo en Argentina no tienen ningún cálculo estructural documentado.',
            },
            {
              pregunta: '¿Cuánto dura una MOVARA comparada con una casa tradicional?',
              respuesta:
                'Una casa de material bien construida dura décadas. Una mal construida se fisura, humedece y deteriora en pocos años.\n\nUna MOVARA tiene garantía MOVARA de 12 meses y una vida útil estimada de más de 30 años con mantenimiento básico. La estructura de acero galvanizado no se oxida ni se degrada. Los paneles de lana de roca no se pudren ni pierden propiedades con el tiempo.\n\nLa diferencia clave: con MOVARA sabés exactamente lo que recibís antes de pagar. Con la construcción tradicional, no.',
            },
            {
              pregunta: '¿El techo de MOVARA es mejor que el techo tradicional?',
              respuesta:
                'Un techo tradicional en Argentina suele tener chapa, isolant y cielorrazo — tres materiales distintos, instalados en tres etapas diferentes, con tres posibilidades de que algo salga mal.\n\nEl techo de MOVARA es un panel sándwich de poliuretano con impermeabilización de 5 capas integrada de fábrica. Una sola pieza. Sin etapas, sin juntas, sin posibilidad de goteras por mala instalación.\n\nEl isolant estándar tiene una conductividad térmica de 0.040 W/m·K. El poliuretano de MOVARA tiene 0.022 W/m·K — casi el doble de eficiente en el mismo espesor.',
            },
            {
              pregunta: '¿Qué pasa con el ruido?',
              respuesta:
                'En una casa de ladrillos estándar, el ruido exterior se reduce entre 35 y 40 dB dependiendo del espesor de la pared y la calidad de la construcción.\n\nLas paredes de lana de roca de MOVARA tienen una aislación acústica de 45 dB o más. Más silencio, sin depender de la calidad de la obra.',
            },
            {
              pregunta: '¿Qué pasa si hay un incendio?',
              respuesta:
                'La lana de roca es incombustible — Clase A1, la máxima clasificación de resistencia al fuego. No arde, no propaga llamas, no genera humo tóxico y mantiene su forma hasta 1.000°C.\n\nUna casa de ladrillos con aislantes orgánicos o madera en los techos arde. Una MOVARA no.',
            },
            {
              pregunta: '¿Es más cara o más barata que construir?',
              respuesta:
                'Construir en Argentina hoy cuesta entre USD 800 y USD 1.500 por m² dependiendo de la zona, los materiales y la mano de obra. Y eso si el presupuesto no sube durante la obra — cosa que en Argentina casi siempre pasa, entre un 30% y un 80% por encima del presupuesto original.\n\nMOVARA tiene un precio por m² fijo desde el día 1. Sin sorpresas. Sin sobrecostos. Lo que acordás es lo que pagás.',
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
