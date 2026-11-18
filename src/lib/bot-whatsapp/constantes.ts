/** Valores de los campos con opciones del bot de WhatsApp. Único lugar donde
 * se definen: los usan los validadores, las rutas y el panel. En la base se
 * guardan como texto (misma convención que Lead.etapa). */

export const ESTADOS_LEAD = [
  "NUEVO",
  "CALIFICADO",
  "DERIVADO",
  "DESCARTADO",
  "CONTACTADO",
  "VISITA",
  "SENA",
  "VENDIDO",
  "PERDIDO",
] as const;
export type EstadoLead = (typeof ESTADOS_LEAD)[number];

export const ETIQUETA_ESTADO: Record<EstadoLead, string> = {
  NUEVO: "Nuevo",
  CALIFICADO: "Calificado",
  DERIVADO: "Derivado",
  DESCARTADO: "Descartado",
  CONTACTADO: "Contactado",
  VISITA: "Visita",
  SENA: "Seña",
  VENDIDO: "Vendido",
  PERDIDO: "Perdido",
};

export const ORIGENES = ["RUTA_SHOWROOM", "WEB", "INSTAGRAM_FACEBOOK", "RECOMENDACION", "OTRO"] as const;
export type Origen = (typeof ORIGENES)[number];

export const ETIQUETA_ORIGEN: Record<Origen, string> = {
  RUTA_SHOWROOM: "Ruta / showroom",
  WEB: "Web",
  INSTAGRAM_FACEBOOK: "Instagram / Facebook",
  RECOMENDACION: "Recomendación",
  OTRO: "Otro",
};

export const DIRECCIONES = ["ENTRANTE", "SALIENTE"] as const;
export const AUTORES = ["CLIENTE", "BOT", "EQUIPO"] as const;
export type Autor = (typeof AUTORES)[number];
export const TIPOS_MENSAJE = ["TEXTO", "AUDIO", "OTRO"] as const;

export const MODOS_RESPALDO = ["MENSAJE_BIENVENIDA", "NINGUNO"] as const;
export type ModoRespaldo = (typeof MODOS_RESPALDO)[number];

export const ETIQUETA_MODO_RESPALDO: Record<ModoRespaldo, string> = {
  MENSAJE_BIENVENIDA: "Mandar el mensaje de bienvenida",
  NINGUNO: "No responder",
};

export const ETIQUETAS_EXCLUIDO = ["AMIGO", "FAMILIA", "PROVEEDOR", "OTRO"] as const;
export type EtiquetaExcluido = (typeof ETIQUETAS_EXCLUIDO)[number];

export const ETIQUETA_EXCLUIDO: Record<EtiquetaExcluido, string> = {
  AMIGO: "Amigo",
  FAMILIA: "Familia",
  PROVEEDOR: "Proveedor",
  OTRO: "Otro",
};

export const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
export type Dia = (typeof DIAS)[number];

export const NOMBRE_DIA: Record<Dia, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
  dom: "Domingo",
};

export type Franja = { desde: string; hasta: string };
export type HorarioAtencion = Record<Dia, Franja[]>;

/** Lunes a viernes 8 a 18, sábado 9 a 13 (hora de Córdoba). */
export const HORARIO_POR_DEFECTO: HorarioAtencion = {
  lun: [{ desde: "08:00", hasta: "18:00" }],
  mar: [{ desde: "08:00", hasta: "18:00" }],
  mie: [{ desde: "08:00", hasta: "18:00" }],
  jue: [{ desde: "08:00", hasta: "18:00" }],
  vie: [{ desde: "08:00", hasta: "18:00" }],
  sab: [{ desde: "09:00", hasta: "13:00" }],
  dom: [],
};

export const MENSAJE_BIENVENIDA_POR_DEFECTO =
  "¡Hola! Gracias por escribir a MOVARA. En este momento no podemos responderte, pero te contestamos a la brevedad. Mientras tanto, podés ver nuestros modelos en movara.com.ar.";

/** Porcentaje del tope desde el que la barra de gasto se pone amarilla. */
export const AVISO_GASTO = 0.8;
