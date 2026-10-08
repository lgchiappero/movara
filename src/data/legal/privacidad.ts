import type { DocumentoLegal } from "@/lib/legal/campos";
import { EMPRESA, LEGAL_ACTUALIZADO } from "./empresa";

const E = EMPRESA;

/** Política de Privacidad (Ley 25.326). Redactada sobre el relevamiento de
 * los datos que el sitio recolecta de verdad — si se agrega un formulario,
 * un proveedor o una herramienta de medición, hay que actualizarla. */
export const POLITICA_PRIVACIDAD: DocumentoLegal = {
  titulo: "Política de Privacidad",
  actualizado: LEGAL_ACTUALIZADO,
  intro: `En MOVARA cuidamos los datos personales de quienes nos consultan y nos compran. Esta política explica qué datos recolectamos en ${E.sitio}, para qué los usamos, con quién los compartimos, cuánto tiempo los guardamos y cómo podés ejercer tus derechos, conforme a la Ley 25.326 de Protección de los Datos Personales y su normativa complementaria.`,
  secciones: [
    {
      id: "responsable",
      titulo: "1. Quién es el responsable de tus datos",
      bloques: [
        {
          tipo: "p",
          texto: `El responsable de la base de datos es ${E.razonSocial} ("MOVARA"), CUIT ${E.cuit}, con domicilio en ${E.domicilio}. Para cualquier consulta sobre tus datos personales podés escribirnos a ${E.email}.`,
        },
      ],
    },
    {
      id: "datos",
      titulo: "2. Qué datos recolectamos y dónde",
      bloques: [
        { tipo: "p", texto: "Solo recolectamos los datos que vos nos das o que se generan al usar el sitio:" },
        {
          tipo: "lista",
          items: [
            "Formularios de contacto y de información (dossier): nombre, apellido, DNI (opcional), teléfono, email, provincia y el mensaje o las preferencias que nos indiques.",
            "Aviso de salida (\"antes de irte\"): tu email.",
            "Configurador: nombre o razón social, persona de contacto, WhatsApp, email, tipo de cliente, provincia, localidad y la configuración del espacio que elegiste, con su precio estimado.",
            "Agenda de visitas al showroom: nombre, email, teléfono, tipo de cliente, razón social (si sos empresa), la consulta que nos dejes y la fecha y el horario elegidos. Para cancelar una visita te pedimos el email con el que agendaste, solo para verificar que seas vos.",
            "Seguimiento de pedido: no te pedimos datos; se accede con el link personal que te enviamos.",
            "Clientes: para ejecutar la compra registramos los datos del contrato (nombre, DNI o CUIT, domicilio, email y teléfono), la dirección de entrega, los pagos y la documentación de la compra y de la entrega.",
            "Recibo en Conformidad de entrega: cuando confirmás la recepción de la unidad desde el link que te enviamos por email, registramos la fecha y hora, la dirección IP, el dispositivo y navegador (user-agent) y un código de integridad del contenido confirmado, como evidencia de la confirmación.",
            "Mensajes por WhatsApp: algunos botones del sitio arman un mensaje con los datos que cargaste y abren WhatsApp; ese mensaje se envía recién cuando vos lo mandás, y se rige además por las políticas de WhatsApp.",
            "Datos técnicos: al navegar, nuestros proveedores de hosting registran datos técnicos de cada visita (dirección IP, navegador, página visitada, fecha y hora) para el funcionamiento y la seguridad del sitio. Para limitar el abuso de los formularios guardamos por una hora un identificador cifrado de la IP, nunca la IP en claro.",
          ],
        },
        {
          tipo: "p",
          texto: "Los datos marcados como obligatorios en cada formulario son necesarios para responderte o para prestar el servicio; si no los completás, no podremos hacerlo. Te pedimos que los datos sean verdaderos y estén actualizados.",
        },
      ],
    },
    {
      id: "finalidad",
      titulo: "3. Para qué los usamos y con qué base",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Responder tus consultas, enviarte la información o el presupuesto que pediste y coordinar visitas al showroom, con tu consentimiento al enviar cada formulario.",
            "Ejecutar el contrato de compra: gestionar el pedido, los pagos, la logística, la entrega, el Recibo en Conformidad y la garantía.",
            "Enviarte avisos sobre tu pedido o tu visita (confirmaciones, recordatorios, cambios de estado).",
            "Medir el funcionamiento del sitio y de nuestros anuncios (ver Cookies y Meta Pixel).",
            "Cumplir obligaciones legales y defender nuestros derechos ante un reclamo.",
          ],
        },
        {
          tipo: "p",
          texto: "No vendemos ni cedemos tus datos a terceros para que los usen con fines propios, y no los usamos para fines distintos de los indicados en esta política.",
        },
      ],
    },
    {
      id: "cookies",
      titulo: "4. Cookies y Meta Pixel",
      bloques: [
        {
          tipo: "p",
          texto: "Usamos el Meta Pixel, una herramienta de Meta Platforms (Facebook e Instagram) que, mediante una cookie y un script, registra que visitaste el sitio y algunas acciones generales (ver una página, ver un modelo, iniciar una consulta) para medir nuestros anuncios y mostrar publicidad de MOVARA a personas interesadas. Junto con esos eventos solo enviamos el modelo, la finalidad y la provincia elegidos; nunca tu nombre, tu email ni tu teléfono. Meta recibe además los datos técnicos de la visita (IP, navegador, página) según su propia política de privacidad.",
        },
        {
          tipo: "p",
          texto: "Además, el sitio guarda en tu navegador (almacenamiento local) si ya viste o completaste el aviso de salida, para no volver a mostrártelo. Algunas páginas incluyen videos de YouTube (en modo de privacidad mejorada) y un mapa de Google Maps, que pueden usar sus propias cookies cuando los reproducís o interactuás con ellos. El panel interno de MOVARA usa una cookie de sesión solo para el personal autorizado.",
        },
        {
          tipo: "p",
          texto: "Podés bloquear o borrar las cookies y el almacenamiento local desde la configuración de tu navegador, usar extensiones que bloquean el seguimiento y administrar los anuncios que ves desde la configuración de anuncios de tu cuenta de Facebook o Instagram. Si los bloqueás, el sitio sigue funcionando.",
        },
      ],
    },
    {
      id: "proveedores",
      titulo: "5. Proveedores y transferencia internacional",
      bloques: [
        {
          tipo: "p",
          texto: "Para operar el sitio trabajamos con proveedores que tratan los datos por cuenta nuestra y bajo nuestras instrucciones. Varios de ellos tienen sus servidores fuera de Argentina:",
        },
        {
          tipo: "lista",
          items: [
            "Vercel Inc. — alojamiento del sitio y ejecución de los formularios (servidores en Washington D.C., Estados Unidos).",
            "Supabase Inc. — base de datos y almacenamiento de documentos, sobre infraestructura de Amazon Web Services (servidores en San Pablo, Brasil).",
            "Resend Inc. — envío de emails (servidores en Estados Unidos).",
            "Meta Platforms — Meta Pixel y WhatsApp (servidores en Estados Unidos y otros países).",
            "Sanity Inc. — gestión de los textos e imágenes del sitio; no recibe los datos que cargás en los formularios.",
          ],
        },
        {
          tipo: "p",
          texto: "Algunos de esos países no tienen, según la normativa argentina, un nivel de protección de datos equivalente al nuestro. Al enviarnos tus datos prestás tu consentimiento para esa transferencia internacional, conforme al artículo 12 de la Ley 25.326. Elegimos proveedores que aplican medidas de seguridad y confidencialidad reconocidas, y les exigimos usar los datos solo para prestarnos el servicio.",
        },
      ],
    },
    {
      id: "conservacion",
      titulo: "6. Cuánto tiempo guardamos tus datos",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Consultas que no terminan en una compra (formularios, aviso de salida, configurador, visitas): hasta 24 meses desde el último contacto; después las eliminamos.",
            "Clientes: los datos del contrato, los pagos, la documentación de la compra y de la entrega y los Recibos en Conformidad, mientras dure la relación comercial y la garantía, y después durante los plazos legales de conservación de la documentación y de prescripción de las acciones que puedan surgir de la compra.",
            "Datos técnicos de navegación: el tiempo que los conservan nuestros proveedores de hosting para el funcionamiento y la seguridad del sitio; el identificador cifrado de la IP usado para limitar abusos, una hora.",
          ],
        },
        {
          tipo: "p",
          texto: "Cumplidos esos plazos, los datos se eliminan o se anonimizan.",
        },
      ],
    },
    {
      id: "derechos",
      titulo: "7. Tus derechos y cómo ejercerlos",
      bloques: [
        {
          tipo: "p",
          texto: `Tenés derecho a acceder a tus datos personales, a pedir que se rectifiquen, actualicen o supriman, y a retirar el consentimiento que nos diste. Para ejercerlos escribinos a ${E.email} desde el email que nos diste o acreditando tu identidad, e indicanos qué derecho querés ejercer.`,
        },
        {
          tipo: "p",
          texto: "Respondemos los pedidos de acceso dentro de los 10 días corridos y los de rectificación, actualización o supresión dentro de los 5 días hábiles de recibidos, como establece la Ley 25.326. La supresión no procede cuando tenemos la obligación legal de conservar los datos o cuando pudiera perjudicar derechos de terceros.",
        },
        {
          tipo: "p",
          texto: "El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.",
        },
        {
          tipo: "p",
          texto: "La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.",
        },
      ],
    },
    {
      id: "seguridad",
      titulo: "8. Seguridad",
      bloques: [
        {
          tipo: "p",
          texto: "Aplicamos medidas técnicas y organizativas para proteger tus datos: conexiones cifradas (HTTPS), acceso al panel interno solo para personal autorizado con usuario y contraseña, documentos guardados en almacenamiento privado con enlaces de acceso temporales y links personales con códigos aleatorios. Ningún sistema es infalible; si detectamos un incidente que afecte tus datos, te lo vamos a informar.",
        },
      ],
    },
    {
      id: "menores",
      titulo: "9. Menores de edad",
      bloques: [
        {
          tipo: "p",
          texto: `El sitio está dirigido a personas mayores de 18 años. No recolectamos a sabiendas datos de menores; si nos enteramos de que recibimos datos de un menor sin autorización de sus representantes, los eliminamos. Si sos madre, padre o tutor y creés que eso pasó, escribinos a ${E.email}.`,
        },
      ],
    },
    {
      id: "cambios",
      titulo: "10. Cambios en esta política",
      bloques: [
        {
          tipo: "p",
          texto: "Podemos actualizar esta política, por ejemplo si cambian nuestros servicios, nuestros proveedores o la normativa. La versión vigente es siempre la publicada en esta página, con su fecha de última actualización. Si el cambio es importante, lo vamos a avisar en el sitio.",
        },
      ],
    },
  ],
};
