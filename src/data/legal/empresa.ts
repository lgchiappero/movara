/** Datos de MOVARA que aparecen en /privacidad y /terminos.
 *
 * Nunca dejar texto entre corchetes: se toma como campo a completar — en
 * desarrollo se resalta y en producción el build falla (ver
 * src/lib/legal/campos.ts). */
export const EMPRESA = {
  razonSocial: "Luciano Gastón Chiappero",
  cuit: "20-31832112-5",
  domicilio: "Lainez 690, Sunchales, provincia de Santa Fe",
  // Se usa en "los tribunales ordinarios de {jurisdiccion}".
  jurisdiccion: "la ciudad de Rafaela, provincia de Santa Fe",
  email: "contacto@movara.com.ar",
  sitio: "movara.com.ar",
};

/** Fecha de la última actualización de los dos textos legales. */
export const LEGAL_ACTUALIZADO = "8 de octubre de 2026";
