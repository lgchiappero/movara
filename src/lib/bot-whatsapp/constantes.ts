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

/** Solo para cuando se alcanzó el tope de gasto con el bot activo. Pausado
 * manualmente (activo = false) el bot no responde nada. */
export const ETIQUETA_MODO_RESPALDO: Record<ModoRespaldo, string> = {
  MENSAJE_BIENVENIDA: "Mandar el mensaje de bienvenida (una vez, solo a números nuevos que pasen el filtro de palabras)",
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

/** Filtro SIN IA para el mensaje de bienvenida cuando se alcanzó el tope de
 * gasto: el primer mensaje de un número nuevo tiene que contener alguna de
 * estas palabras (sin distinguir mayúsculas ni tildes, palabra completa) o
 * empezar con un texto precargado de la web. Editable. */
export const PALABRAS_CLAVE_BIENVENIDA = [
  "movara",
  "casa",
  "casas",
  "modular",
  "modulares",
  "prefabricada",
  "contenedor",
  "showroom",
  "ruta",
  "cartel",
  "info",
  "información",
  "precio",
  "presupuesto",
  "cotización",
] as const;

/** Los textos precargados de los botones de WhatsApp de la web empiezan así. */
export const PREFIJOS_PRECARGADOS_WEB = ["hola movara"] as const;

/** Respuesta fija a audios y otros mensajes que no son texto. */
export const MENSAJE_SIN_AUDIO = "¡Gracias! Ahora no puedo escuchar audios, ¿me lo contás por escrito?";

/** Cierre al llegar al máximo de respuestas sin calificar. */
export const MENSAJE_CIERRE_MAXIMO = "Gracias por contarme todo. Le paso tu consulta a Luciano y te escribe personalmente.";

/** Ventana de WhatsApp para responder sin plantillas. */
export const VENTANA_24H_MS = 24 * 60 * 60 * 1000;
