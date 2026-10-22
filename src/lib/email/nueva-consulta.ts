import { escapeHtml } from "./escape-html";

/** Bloque opcional del email: extras "A cotizar" y notas del cliente. Todo lo
 *  que viene del cliente pasa por escapeHtml; los saltos de línea de las
 *  notas se respetan con <br>. */
export function detalleConsultaHtml(aCotizar: string[], notas: string | null): string {
  const partes: string[] = [];
  if (aCotizar.length) {
    partes.push(
      `<p style="margin:16px 0 6px;color:#2F2F2F;font-weight:bold;">A cotizar</p>` +
        `<ul style="margin:0;padding-left:18px;color:#555;line-height:1.6;">${aCotizar
          .map((o) => `<li>${escapeHtml(o)} — <strong style="color:#854F0B;">A cotizar</strong></li>`)
          .join("")}</ul>`
    );
  }
  if (notas) {
    partes.push(
      `<p style="margin:16px 0 6px;color:#2F2F2F;font-weight:bold;">Notas del cliente</p>` +
        `<p style="margin:0;color:#555;line-height:1.6;">${escapeHtml(notas).replace(/\r?\n/g, "<br>")}</p>`
    );
  }
  return partes.join("");
}
