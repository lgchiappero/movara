export const HORARIOS_MANANA = ["09:00", "10:00", "11:00", "12:00"] as const;
export const HORARIOS_TARDE = ["14:00", "15:00", "16:00", "17:00"] as const;
export const HORARIOS_AGENDA = [...HORARIOS_MANANA, ...HORARIOS_TARDE] as const;

export type Horario = (typeof HORARIOS_AGENDA)[number];

export function isHorarioValido(value: string): value is Horario {
  return (HORARIOS_AGENDA as readonly string[]).includes(value);
}

/** true si `fecha` (date-only) cae de lunes a sábado — el único día que
 * "Habilitar mes completo" excluye es el domingo. El domingo se puede
 * habilitar igual, pero a mano, día por día. */
export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getUTCDay();
  return dia !== 0;
}

export function esDomingo(fecha: Date): boolean {
  return fecha.getUTCDay() === 0;
}
