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

