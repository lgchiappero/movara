import type { DocumentoLegal } from "@/lib/legal/campos";
import { GARANTIA_MESES } from "@/lib/pedido/garantia";
import { EMPRESA, LEGAL_ACTUALIZADO } from "./empresa";

const E = EMPRESA;

/** Términos y Condiciones de uso del sitio. Sin mencionar al proveedor, sin
 * la palabra "plegable" y sin claims de producción nacional. */
export const TERMINOS_CONDICIONES: DocumentoLegal = {
  titulo: "Términos y Condiciones",
  actualizado: LEGAL_ACTUALIZADO,
  intro: `Estos términos regulan el uso del sitio ${E.sitio}. Al navegarlo o usar sus formularios y herramientas, aceptás estos términos y nuestra Política de Privacidad. Si no estás de acuerdo, te pedimos que no uses el sitio.`,
  secciones: [
    {
      id: "identificacion",
      titulo: "1. Quiénes somos",
      bloques: [
        {
          tipo: "p",
          texto: `El sitio es operado por ${E.razonSocial} ("MOVARA"), CUIT ${E.cuit}, con domicilio en ${E.domicilio}. Contacto: ${E.email}.`,
        },
      ],
    },
    {
      id: "informacion",
      titulo: "2. Imágenes, valores y presupuestos",
      bloques: [
        {
          tipo: "p",
          texto: "Las imágenes, renderizaciones y planos del sitio son ilustrativos: pueden mostrar terminaciones, equipamiento o entornos que no forman parte de la unidad estándar.",
        },
        {
          tipo: "p",
          texto: "Los valores publicados en el sitio (precios, medidas, especificaciones y plazos) son referenciales y pueden actualizarse sin previo aviso.",
        },
        {
          tipo: "p",
          texto: "La oferta formal de MOVARA es el presupuesto escrito y personalizado que entregamos a cada cliente, con su plazo de validez. La compra se rige por el contrato de compra que firman las partes.",
        },
      ],
    },
    {
      id: "configurador",
      titulo: "3. Configurador",
      bloques: [
        {
          tipo: "p",
          texto: "El configurador y cualquier precio que el sitio calcule son estimaciones referenciales basadas en la información que cargaste. No reemplazan al presupuesto escrito y personalizado: el precio y las condiciones de tu unidad son los que figuran en ese presupuesto, dentro de su plazo de validez, y en el contrato de compra, y pueden variar según la configuración final, la ubicación del terreno, la logística y los impuestos aplicables.",
        },
      ],
    },
    {
      id: "preventa",
      titulo: "4. Preventa, reserva y plazos",
      bloques: [
        {
          tipo: "p",
          texto: "La unidad se reserva con el pago del anticipo, en las condiciones que establezca el contrato de compra. Enviar un formulario, usar el configurador o agendar una visita no implica una reserva ni una compra.",
        },
        {
          tipo: "p",
          texto: "Los plazos de entrega informados son estimados: en general, 90 días en adelante desde que se confirma el pedido con el anticipo. Pueden variar por cuestiones de logística, transporte y trámites aduaneros. Los plazos y las condiciones aplicables a cada compra son los del contrato de compra.",
        },
      ],
    },
    {
      id: "garantia",
      titulo: "5. Garantía",
      bloques: [
        {
          tipo: "p",
          texto: `Las unidades MOVARA tienen una garantía de ${GARANTIA_MESES} meses desde la entrega, con los alcances y condiciones establecidos en el contrato de compra. La fecha de entrega y el inicio de la garantía quedan registrados en el Recibo en Conformidad de entrega.`,
        },
      ],
    },
    {
      id: "uso",
      titulo: "6. Uso del sitio",
      bloques: [
        {
          tipo: "p",
          texto: "Te comprometés a usar el sitio de buena fe y conforme a la ley. En particular, no está permitido:",
        },
        {
          tipo: "lista",
          items: [
            "cargar datos falsos o de otra persona sin su autorización;",
            "usar los formularios para enviar mensajes masivos, publicidad o contenido ilegal u ofensivo;",
            "intentar acceder a áreas restringidas, a datos de otros usuarios o a los sistemas del sitio;",
            "interferir con el funcionamiento del sitio o usar programas automáticos para extraer su contenido.",
          ],
        },
        {
          tipo: "p",
          texto: "Los links personales que te enviamos (seguimiento de pedido, Recibo en Conformidad, cancelación de visitas) son para tu uso; no los compartas.",
        },
      ],
    },
    {
      id: "propiedad",
      titulo: "7. Propiedad intelectual",
      bloques: [
        {
          tipo: "p",
          texto: "La marca MOVARA, su logo, los textos, las fotografías, las imágenes, los diseños, los planos y el resto del contenido del sitio pertenecen a MOVARA o a quienes le otorgaron licencia, y están protegidos por las leyes de propiedad intelectual y de marcas. No podés copiarlos, reproducirlos, modificarlos ni usarlos con fines comerciales sin autorización escrita de MOVARA.",
        },
      ],
    },
    {
      id: "terceros",
      titulo: "8. Servicios y sitios de terceros",
      bloques: [
        {
          tipo: "p",
          texto: "El sitio incluye links y contenidos de terceros, como WhatsApp, Instagram, YouTube y Google Maps. MOVARA no controla esos servicios ni es responsable por su contenido o funcionamiento; su uso se rige por los términos y políticas de cada uno.",
        },
      ],
    },
    {
      id: "responsabilidad",
      titulo: "9. Limitación de responsabilidad",
      bloques: [
        {
          tipo: "p",
          texto: "Trabajamos para que el sitio funcione correctamente y su información esté actualizada, pero no garantizamos que esté libre de errores ni disponible en todo momento. MOVARA no es responsable por daños derivados del uso del sitio o de la imposibilidad de usarlo, de interrupciones técnicas, de errores en los valores referenciales publicados, ni del uso que terceros hagan de los servicios enlazados.",
        },
        {
          tipo: "p",
          texto: "Nada de lo dispuesto en estos términos limita los derechos que te reconocen la Ley 24.240 de Defensa del Consumidor y demás normas aplicables, ni las obligaciones que MOVARA asume en el contrato de compra.",
        },
      ],
    },
    {
      id: "privacidad",
      titulo: "10. Privacidad",
      bloques: [
        {
          tipo: "p",
          texto: "El tratamiento de tus datos personales se rige por nuestra Política de Privacidad, publicada en movara.com.ar/privacidad.",
        },
      ],
    },
    {
      id: "cambios",
      titulo: "11. Cambios en estos términos",
      bloques: [
        {
          tipo: "p",
          texto: "Podemos modificar estos términos en cualquier momento. La versión vigente es la publicada en esta página, con su fecha de última actualización, y se aplica desde su publicación. Los cambios no afectan los contratos de compra ya firmados.",
        },
      ],
    },
    {
      id: "ley",
      titulo: "12. Ley aplicable y jurisdicción",
      bloques: [
        {
          tipo: "p",
          texto: `Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los tribunales ordinarios de ${E.jurisdiccion}, sin perjuicio del derecho de los consumidores a presentarse ante los tribunales que les correspondan según la Ley 24.240 de Defensa del Consumidor.`,
        },
      ],
    },
    {
      id: "contacto",
      titulo: "13. Contacto",
      bloques: [
        {
          tipo: "p",
          texto: `Por cualquier consulta sobre estos términos escribinos a ${E.email}.`,
        },
      ],
    },
  ],
};
