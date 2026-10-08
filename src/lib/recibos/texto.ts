import { calcularGarantiaFechaFin, GARANTIA_MESES } from "@/lib/pedido/garantia";

/** Versión del texto. Si el texto cambia, se sube la versión: los recibos ya
 * confirmados guardan su `textoConfirmado` y no se ven afectados. */
export const TEXTO_RECIBO_VERSION = "v1";

export type DatosTextoRecibo = {
  numeroRecibo: string;
  fechaEntrega: Date;
  lugarEntrega: string;
  observaciones: string | null;
  clienteNombre: string;
  clienteDni: string | null;
  clienteCuit: string | null;
  numeroUnidad: string;
  modelo: string;
};

export type ClausulaRecibo = { titulo: string; texto: string };

export type TextoRecibo = {
  titulo: string;
  numero: string;
  encabezado: string;
  clausulas: ClausulaRecibo[];
};

/** "8 de octubre de 2026". Las fechas de entrega se guardan a medianoche UTC
 * (input type="date"), así que se formatean en UTC para no correr el día. */
export function fechaLargaUTC(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

/** "8/10/2026, 14:32" en hora de Argentina — para la fecha de confirmación. */
export function fechaHoraAR(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fechaFinGarantia(fechaEntrega: Date): Date {
  return calcularGarantiaFechaFin(fechaEntrega)!;
}

/** "DNI 30.123.456" / "CUIT 20-30123456-7" — el DNI tiene prioridad (es lo
 * que pide el encabezado); sin ninguno de los dos, no se menciona. */
function documentoCliente(dni: string | null, cuit: string | null): string | null {
  if (dni?.trim()) return `DNI ${dni.trim()}`;
  if (cuit?.trim()) return `CUIT ${cuit.trim()}`;
  return null;
}

/** Texto del Recibo en Conformidad. Única fuente para la página pública, el
 * PDF, el email y el hash — lo que se muestra es exactamente lo que se
 * confirma y lo que queda guardado. */
export function construirTextoRecibo(d: DatosTextoRecibo): TextoRecibo {
  const doc = documentoCliente(d.clienteDni, d.clienteCuit);
  const fecha = fechaLargaUTC(d.fechaEntrega);
  const fin = fechaLargaUTC(fechaFinGarantia(d.fechaEntrega));
  // Sin el punto final: la cláusula ya cierra con uno ("…lado norte.").
  const obs = d.observaciones?.trim().replace(/[.\s]+$/, "");

  return {
    titulo: "RECIBO EN CONFORMIDAD DE ENTREGA",
    numero: `Nº ${d.numeroRecibo}`,
    encabezado: `En ${d.lugarEntrega}, el ${fecha}, ${d.clienteNombre}${doc ? `, ${doc}` : ""}, en adelante "el Cliente", declara:`,
    clausulas: [
      {
        titulo: "1. Recepción",
        texto: `que recibió de MOVARA la unidad Nº ${d.numeroUnidad}, modelo ${d.modelo}, en el lugar y la fecha indicados, en cumplimiento del contrato de compra celebrado entre las partes.`,
      },
      {
        titulo: "2. Estado",
        texto:
          `que la recibe en conformidad, en buen estado y de acuerdo con lo pactado, ${obs ? `salvo: ${obs}` : "sin observaciones"}. ` +
          "La conformidad se refiere al estado aparente de la unidad al momento de la entrega y no implica renuncia a la garantía por defectos de fabricación o vicios ocultos.",
      },
      {
        titulo: "3. Garantía",
        texto: `con esta entrega comienza la garantía de ${GARANTIA_MESES} meses, del ${fecha} al ${fin}, con los alcances y condiciones del contrato de compra.`,
      },
      {
        titulo: "4. Alcance",
        texto:
          "este recibo acredita únicamente la entrega y recepción de la unidad. No es factura ni comprobante de pago, y no modifica las obligaciones de las partes del contrato de compra.",
      },
      {
        titulo: "5. Firma electrónica",
        texto:
          "El Cliente confirma este recibo mediante el enlace enviado al correo electrónico declarado en el contrato de compra, lo que constituye firma electrónica en los términos del artículo 5 de la Ley 25.506. Se registran como evidencia la fecha y hora, la dirección IP, el dispositivo y un código de integridad (SHA-256) del contenido confirmado.",
      },
      {
        titulo: "6. Datos personales",
        texto:
          "El Cliente presta consentimiento para que MOVARA conserve los datos de este recibo y la evidencia de la confirmación con la única finalidad de acreditar la entrega y gestionar la garantía, conforme a la Ley 25.326. Puede ejercer sus derechos de acceso, rectificación y supresión escribiendo a contacto@movara.com.ar.",
      },
    ],
  };
}

/** Texto plano exacto (lo que se guarda en `textoConfirmado` y entra en el hash). */
export function textoPlano(t: TextoRecibo): string {
  return [t.titulo, t.numero, "", t.encabezado, "", ...t.clausulas.flatMap((c) => [`${c.titulo}: ${c.texto}`, ""])]
    .join("\n")
    .trim();
}
