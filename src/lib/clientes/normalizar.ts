/** Claves de deduplicación de clientes y leads (columnas emailNorm y
 * telefonoNorm). Se comparan por igualdad: dos contactos con la misma clave
 * son la misma persona. */

/** Email en minúsculas y sin espacios; null si no parece un email. */
export function claveEmail(email: string | null | undefined): string | null {
  const v = (email ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+$/.test(v) ? v : null;
}

const MIN_DIGITOS = 8;

/** Teléfono argentino reducido a sus 10 dígitos (código de área + número),
 * sin +54, sin el 9 de los celulares, sin el 0 de larga distancia ni el 15.
 * "+54 9 11 1234-5678", "011 15 1234-5678" y "11 1234 5678" dan la misma
 * clave. Un número de otro país queda con todos sus dígitos. Null si tiene
 * menos de 8 dígitos. */
export function claveTelefono(telefono: string | null | undefined): string | null {
  let d = (telefono ?? "").replace(/\D/g, "");
  const internacional = (telefono ?? "").trimStart().startsWith("+") || d.startsWith("00");
  d = d.replace(/^00/, "");

  if (d.startsWith("54") && (internacional || d.length > 11)) {
    d = d.slice(2).replace(/^9/, "");
  } else if (internacional) {
    return d.length >= MIN_DIGITOS ? d : null;
  }
  d = d.replace(/^0/, "");

  // El 15 va después del código de área (2 a 4 dígitos): 11 15 1234 5678.
  if (d.length === 12) {
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === "15") {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }
  return d.length >= MIN_DIGITOS ? d : null;
}

/** emailNorm y telefonoNorm para guardar junto con un email y un teléfono. */
export function clavesContacto(email: string | null | undefined, telefono: string | null | undefined) {
  return { emailNorm: claveEmail(email), telefonoNorm: claveTelefono(telefono) };
}
