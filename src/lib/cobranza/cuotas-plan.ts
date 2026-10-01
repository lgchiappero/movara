/** Formulario de cuotas del modal "Nuevo plan de pago" — tipo de cuota +
 * descripción. La descripción se genera sola según el tipo ("Anticipo",
 * "Cuota 2/3", "Saldo") y se re-numera al agregar/quitar cuotas, hasta que
 * el admin la edita a mano: desde ahí se respeta tal cual. "Otro" es texto
 * libre. */

export const TIPO_CUOTA_OPTIONS = ["anticipo", "cuota", "saldo", "otro"] as const;
export type TipoCuotaPlan = (typeof TIPO_CUOTA_OPTIONS)[number];

export const TIPO_CUOTA_LABELS: Record<TipoCuotaPlan, string> = {
  anticipo: "Anticipo",
  cuota: "Cuota",
  saldo: "Saldo",
  otro: "Otro",
};

export type CuotaPlanForm = {
  tipo: TipoCuotaPlan;
  descripcion: string;
  /** true una vez que el admin escribió la descripción a mano. */
  editada: boolean;
  importe: string;
  vencimiento: string;
};

function descripcionAutomatica(tipo: TipoCuotaPlan, numero: number, total: number): string {
  switch (tipo) {
    case "anticipo":
      return "Anticipo";
    case "cuota":
      return `Cuota ${numero}/${total}`;
    case "saldo":
      return "Saldo";
    case "otro":
      return "";
  }
}

/** Recalcula las descripciones automáticas (las no editadas) — "Cuota k/N"
 * se numera entre las cuotas de tipo "cuota" en el orden del formulario. */
export function renumerarCuotas(cuotas: CuotaPlanForm[]): CuotaPlanForm[] {
  const totalCuotas = cuotas.filter((c) => c.tipo === "cuota").length;
  let k = 0;
  return cuotas.map((c) => {
    if (c.tipo === "cuota") k++;
    if (c.editada) return c;
    return { ...c, descripcion: descripcionAutomatica(c.tipo, k, totalCuotas) };
  });
}

export function nuevaCuota(tipo: TipoCuotaPlan): CuotaPlanForm {
  return { tipo, descripcion: "", editada: false, importe: "", vencimiento: "" };
}

/** Al cambiar el tipo, la descripción vuelve a ser automática (salvo en
 * "Otro", que es texto libre y conserva lo que haya escrito). */
export function cambiarTipoCuota(c: CuotaPlanForm, tipo: TipoCuotaPlan): CuotaPlanForm {
  return tipo === "otro" ? { ...c, tipo, editada: true } : { ...c, tipo, editada: false };
}

/** Plantillas de cuotas para pagos a proveedores: la fábrica cobra
 * típicamente 50% al confirmar + 50% antes del embarque; la logística
 * nacional, en un pago único. Editables después de aplicarlas. */
export type PresetCuota = { tipo: TipoCuotaPlan; descripcion: string; porcentaje: number };

export const PRESET_FABRICA: PresetCuota[] = [
  { tipo: "anticipo", descripcion: "Anticipo 50% (al confirmar)", porcentaje: 50 },
  { tipo: "saldo", descripcion: "Saldo 50% (antes del embarque)", porcentaje: 50 },
];

export const PRESET_PAGO_UNICO: PresetCuota[] = [{ tipo: "otro", descripcion: "Pago único", porcentaje: 100 }];

/** Importes de cada cuota según su porcentaje del total, redondeados a
 * centavos; la diferencia de redondeo va a la última. Sin total → vacíos. */
export function importesPorPorcentaje(total: number, porcentajes: number[]): string[] {
  if (!(total > 0)) return porcentajes.map(() => "");
  const centavos = Math.round(total * 100);
  const partes = porcentajes.map((p) => Math.floor((centavos * p) / 100));
  partes[partes.length - 1] += centavos - partes.reduce((a, b) => a + b, 0);
  return partes.map((c) => String(c / 100));
}

export function cuotasDesdePreset(preset: PresetCuota[], total: number): CuotaPlanForm[] {
  const importes = importesPorPorcentaje(total, preset.map((p) => p.porcentaje));
  return preset.map((p, i) => ({ tipo: p.tipo, descripcion: p.descripcion, editada: true, importe: importes[i], vencimiento: "" }));
}
