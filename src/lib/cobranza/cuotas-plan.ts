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
