import { createHmac } from "crypto";
import { igualSeguro } from "@/lib/seguridad/igual-seguro";

/** Valida la firma de un webhook de Meta: el header X-Hub-Signature-256 es
 * "sha256=" + HMAC-SHA256 del body crudo con el App Secret de la app. Sin
 * App Secret configurado, todo se rechaza (el webhook nunca queda abierto). */
export function firmaValida(bodyCrudo: string, header: string | null, appSecret: string | undefined): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const esperada = createHmac("sha256", appSecret).update(bodyCrudo, "utf8").digest("hex");
  return igualSeguro(header.slice("sha256=".length).toLowerCase(), esperada);
}

/** Firma un body como lo haría Meta (tests, e2e y el simulador local). */
export function firmar(bodyCrudo: string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(bodyCrudo, "utf8").digest("hex")}`;
}
