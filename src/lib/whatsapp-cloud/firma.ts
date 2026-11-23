import { createHmac } from "crypto";
import { igualSeguro } from "@/lib/seguridad/igual-seguro";

/** Se recortan espacios y saltos de línea de los bordes del App Secret: un
 * espacio pegado de más en Vercel rompía todas las firmas. Un App Secret de
 * Meta nunca tiene espacios, así que no afloja nada. */
function limpiarSecreto(appSecret: string | undefined): string {
  return appSecret?.trim() ?? "";
}

function hmac(bodyCrudo: string, secreto: string): string {
  return createHmac("sha256", secreto).update(bodyCrudo, "utf8").digest("hex");
}

/** Valida la firma de un webhook de Meta: el header X-Hub-Signature-256 es
 * "sha256=" + HMAC-SHA256 del body crudo con el App Secret de la app. Sin
 * App Secret configurado, todo se rechaza (el webhook nunca queda abierto). */
export function firmaValida(bodyCrudo: string, header: string | null, appSecret: string | undefined): boolean {
  const secreto = limpiarSecreto(appSecret);
  if (!secreto || !header?.startsWith("sha256=")) return false;
  return igualSeguro(header.slice("sha256=".length).toLowerCase(), hmac(bodyCrudo, secreto));
}

/** Firma un body como lo haría Meta (tests, e2e y el simulador local). */
export function firmar(bodyCrudo: string, appSecret: string): string {
  return `sha256=${hmac(bodyCrudo, appSecret)}`;
}

/** Datos para diagnosticar una firma rechazada, sin nada que revele el App
 * Secret: su largo, si tenía espacios en los bordes, el tamaño del body y los
 * primeros 8 caracteres de la firma recibida y de la calculada (un prefijo de
 * un HMAC no permite reconstruir la clave). TEMPORAL: sacarlo cuando la firma
 * de producción quede resuelta. */
export function diagnosticoFirma(bodyCrudo: string, header: string | null, appSecret: string | undefined) {
  const crudo = appSecret ?? "";
  const secreto = limpiarSecreto(appSecret);
  return {
    secretoConfigurado: secreto.length > 0,
    secretoLargo: secreto.length,
    secretoTeniaEspaciosEnBordes: crudo.length !== secreto.length,
    secretoEsHex: /^[0-9a-f]+$/i.test(secreto),
    cuerpoBytes: Buffer.byteLength(bodyCrudo, "utf8"),
    header: !header ? "ausente" : header.startsWith("sha256=") ? "sha256" : "formato desconocido",
    recibida: header?.startsWith("sha256=") ? header.slice(7, 15).toLowerCase() : null,
    calculada: secreto ? hmac(bodyCrudo, secreto).slice(0, 8) : null,
  };
}
