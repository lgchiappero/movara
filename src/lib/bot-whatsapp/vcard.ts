/** Lectura de archivos .vcf (vCard 2.1, 3.0 y 4.0: los que exportan
 * Android, iPhone, Google Contacts y Outlook). Solo se sacan el nombre y los
 * teléfonos; el resto (fotos, mails, direcciones) se ignora. Se usa en el
 * navegador: el archivo nunca se sube ni se guarda. */

import { MAX_ETIQUETA_IMPORTADA } from "@/lib/bot-whatsapp/importar-excluidos";

export type ContactoVcf = { nombre: string | null; telefonos: string[] };

/** Decodifica quoted-printable (vCard 2.1 de Android) como UTF-8. */
function decodificarQP(valor: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < valor.length; i++) {
    const hex = valor.slice(i + 1, i + 3);
    if (valor[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(valor[i]));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Saca los escapes de vCard 3/4 (\, \; \n \\). */
function desescapar(valor: string): string {
  return valor.replace(/\\([\\,;nN])/g, (_, c: string) => (c === "n" || c === "N" ? " " : c));
}

/** Une las líneas partidas: las que empiezan con espacio o tab (vCard 3/4)
 * y las quoted-printable que terminan en "=" (vCard 2.1). */
function unirLineas(texto: string): string[] {
  const lineas: string[] = [];
  let qpAbierta = false;
  for (const cruda of texto.replace(/\r\n?/g, "\n").split("\n")) {
    if (qpAbierta && lineas.length > 0) {
      lineas[lineas.length - 1] = lineas[lineas.length - 1].slice(0, -1) + cruda;
    } else if (/^[ \t]/.test(cruda) && lineas.length > 0) {
      lineas[lineas.length - 1] += cruda.slice(1);
    } else {
      lineas.push(cruda);
    }
    const ultima = lineas[lineas.length - 1] ?? "";
    qpAbierta = /QUOTED-PRINTABLE/i.test(ultima.split(":")[0]) && ultima.endsWith("=");
  }
  return lineas;
}

/** Nombre de N (Apellido;Nombre;Segundo;Prefijo;Sufijo) → "Nombre Apellido". */
function nombreDeN(valor: string): string {
  const [apellido = "", nombre = "", segundo = ""] = valor.split(/(?<!\\);/).map((p) => desescapar(p).trim());
  return [nombre, segundo, apellido].filter(Boolean).join(" ");
}

export function leerVcf(texto: string): ContactoVcf[] {
  const contactos: ContactoVcf[] = [];
  let actual: { fn: string; n: string; telefonos: string[] } | null = null;

  for (const linea of unirLineas(texto)) {
    const dosPuntos = linea.indexOf(":");
    if (dosPuntos < 0) continue;
    const [propiedad, ...parametros] = linea.slice(0, dosPuntos).split(";");
    const nombre = propiedad.replace(/^[^.]*\./, "").trim().toUpperCase();
    let valor = linea.slice(dosPuntos + 1);
    if (parametros.some((p) => /QUOTED-PRINTABLE/i.test(p))) valor = decodificarQP(valor);

    if (nombre === "BEGIN" && valor.trim().toUpperCase() === "VCARD") {
      actual = { fn: "", n: "", telefonos: [] };
    } else if (!actual) {
      continue;
    } else if (nombre === "END" && valor.trim().toUpperCase() === "VCARD") {
      const nombreFinal = (actual.fn || actual.n).replace(/\s+/g, " ").trim();
      contactos.push({ nombre: nombreFinal || null, telefonos: actual.telefonos });
      actual = null;
    } else if (nombre === "FN") {
      actual.fn = desescapar(valor).trim();
    } else if (nombre === "N") {
      actual.n = nombreDeN(valor);
    } else if (nombre === "TEL") {
      const telefono = valor.trim().replace(/^tel:/i, "");
      if (telefono) actual.telefonos.push(telefono);
    }
  }
  return contactos;
}

/** Lista para mandar al servidor: un renglón por teléfono, con el nombre
 * del contacto. Se recortan nombre (80, el largo de la etiqueta) y teléfono
 * (60): un contacto raro no hace rechazar toda la importación; un teléfono
 * recortado queda como inválido y se saltea. */
export function telefonosDeVcf(contactos: ContactoVcf[]): { telefono: string; nombre: string | null }[] {
  return contactos.flatMap((c) =>
    c.telefonos.map((telefono) => ({ telefono: telefono.slice(0, 60), nombre: c.nombre?.slice(0, MAX_ETIQUETA_IMPORTADA) ?? null })),
  );
}
