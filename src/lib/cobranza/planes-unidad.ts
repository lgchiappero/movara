import { sumaImportes } from "@/lib/cobranza/calc";
import { inicioSemana, finSemana, calcularRangoPeriodo } from "@/lib/cobranza/periodo";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

// Tolerancia para comparar sumas de floats — misma que calc.ts.
const EPSILON = 0.01;

/** Estado de la unidad completa (no de una cuota ni de un plan suelto):
 * - sin_plan: todavía no se cargó ningún plan de pago
 * - pendiente: hay plan pero no entró/salió ningún pago
 * - en_curso: hay pagos pero queda saldo
 * - saldado: se pagó todo lo acordado */
export type EstadoPlanUnidad = "sin_plan" | "pendiente" | "en_curso" | "saldado";

export const ESTADO_PLAN_UNIDAD_LABELS: Record<EstadoPlanUnidad, string> = {
  sin_plan: "Sin plan",
  pendiente: "Pendiente",
  en_curso: "En curso",
  saldado: "Saldado",
};

export const ESTADO_PLAN_UNIDAD_COLORS: Record<EstadoPlanUnidad, string> = {
  sin_plan: "bg-stone-100 text-stone-500",
  pendiente: "bg-amber-100 text-amber-700",
  en_curso: "bg-blue-100 text-blue-700",
  saldado: "bg-emerald-100 text-emerald-700",
};

export type UnidadParaPlanes = {
  id: string;
  numeroUnidad: string | null;
  clienteNombre: string;
  modelo: string | null;
  /** Valor total de la unidad acordado con el cliente (USD). */
  precioCliente: number | null;
};

export type FilaPlanUnidad = {
  /** unidadId|moneda — una unidad con planes en dos monedas (caso legado)
   * aparece en dos filas, porque sumar USD y ARS no tiene sentido. */
  key: string;
  unidad: UnidadParaPlanes;
  moneda: string;
  planes: AcuerdoConDetalle[];
  /** Suma del total acordado de los planes de la unidad (0 sin plan). */
  totalPlan: number;
  /** Lo efectivamente cobrado/pagado — suma de todos los pagos de los planes. */
  pagado: number;
  /** Saldo pendiente de la unidad completa (nunca negativo). */
  saldo: number;
  /** 0–100. */
  porcentaje: number;
  estado: EstadoPlanUnidad;
  /** Fecha del pago más reciente, ISO — null si no hay pagos. */
  ultimoPagoFecha: string | null;
  /** "Anticipo + 3 cuotas" — vacío sin plan. */
  resumenPlan: string;
  tieneVencidas: boolean;
  venceEstaSemana: boolean;
};

type TipoCuota = "anticipo" | "cuota" | "saldo" | "otro";

export function tipoDeCuota(descripcion: string): TipoCuota {
  const d = descripcion.trim().toLowerCase();
  if (d.startsWith("anticipo")) return "anticipo";
  if (d.startsWith("cuota")) return "cuota";
  if (d.startsWith("saldo")) return "saldo";
  return "otro";
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Resumen corto del plan a partir de las descripciones de sus cuotas:
 * ["Anticipo 30%", "Cuota 1/3", "Cuota 2/3", "Cuota 3/3"] → "Anticipo + 3 cuotas". */
export function resumenPlan(descripcionesCuotas: string[]): string {
  const cuenta: Record<TipoCuota, number> = { anticipo: 0, cuota: 0, saldo: 0, otro: 0 };
  for (const d of descripcionesCuotas) cuenta[tipoDeCuota(d)]++;
  const partes: string[] = [];
  if (cuenta.anticipo) partes.push(cuenta.anticipo === 1 ? "Anticipo" : plural(cuenta.anticipo, "anticipo", "anticipos"));
  if (cuenta.cuota) partes.push(plural(cuenta.cuota, "cuota", "cuotas"));
  if (cuenta.saldo) partes.push(cuenta.saldo === 1 ? "Saldo" : plural(cuenta.saldo, "saldo", "saldos"));
  if (cuenta.otro) partes.push(plural(cuenta.otro, "otro", "otros"));
  return partes.join(" + ");
}

/** Una cuota está vencida si su estado ya lo dice, o si su vencimiento ya
 * pasó y no está pagada (el barrido que persiste "vencido" solo corre al
 * entrar a Cobranza/Pagos). */
export function cuotaVencida(c: { estado: string; vencimiento: string | null }, hoy: Date): boolean {
  if (c.estado === "pagado") return false;
  if (c.estado === "vencido") return true;
  return c.vencimiento !== null && new Date(c.vencimiento).getTime() < hoy.getTime();
}

function estadoDe(totalPlan: number, pagado: number, tienePlanes: boolean): EstadoPlanUnidad {
  if (!tienePlanes) return "sin_plan";
  if (pagado >= totalPlan - EPSILON) return "saldado";
  if (pagado > EPSILON) return "en_curso";
  return "pendiente";
}

/** Agrupa los planes (acuerdos de un mismo tipo: cobro o pago) por unidad.
 * Todas las unidades aparecen, tengan plan o no — la vista principal es
 * por unidad. */
export function filasPorUnidad(
  unidades: UnidadParaPlanes[],
  planes: AcuerdoConDetalle[],
  ahora: Date
): FilaPlanUnidad[] {
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  const desdeSemana = inicioSemana(ahora).getTime();
  const hastaSemana = finSemana(ahora).getTime();

  const planesPorUnidad = new Map<string, AcuerdoConDetalle[]>();
  for (const p of planes) {
    const lista = planesPorUnidad.get(p.unidadId) ?? [];
    lista.push(p);
    planesPorUnidad.set(p.unidadId, lista);
  }

  return unidades.flatMap((unidad) => {
    const propios = planesPorUnidad.get(unidad.id) ?? [];
    const monedas = propios.length ? [...new Set(propios.map((p) => p.moneda))] : ["USD"];

    return monedas.map((moneda): FilaPlanUnidad => {
      const delaMoneda = propios.filter((p) => p.moneda === moneda);
      const pagos = delaMoneda.flatMap((p) => p.movimientos);
      const cuotas = delaMoneda.flatMap((p) => p.cuotas);
      const totalPlan = delaMoneda.reduce((acc, p) => acc + p.totalAcordado, 0);
      const pagado = sumaImportes(pagos);
      const ultimo = pagos.reduce<string | null>((max, m) => (max === null || m.fecha > max ? m.fecha : max), null);

      return {
        key: `${unidad.id}|${moneda}`,
        unidad,
        moneda,
        planes: delaMoneda,
        totalPlan,
        pagado,
        saldo: Math.max(0, totalPlan - pagado),
        porcentaje: totalPlan > 0 ? Math.min(100, (pagado / totalPlan) * 100) : 0,
        estado: estadoDe(totalPlan, pagado, delaMoneda.length > 0),
        ultimoPagoFecha: ultimo,
        resumenPlan: resumenPlan(cuotas.map((c) => c.descripcion)),
        tieneVencidas: cuotas.some((c) => cuotaVencida(c, hoy)),
        venceEstaSemana: cuotas.some((c) => {
          if (c.estado === "pagado" || !c.vencimiento) return false;
          const t = new Date(c.vencimiento).getTime();
          return t >= desdeSemana && t < hastaSemana;
        }),
      };
    });
  });
}

export type MetricasPlanes = {
  pendiente: { USD: number; ARS: number };
  /** Unidades que quedaron saldadas con un pago dentro del mes en curso. */
  unidadesSaldadasMes: number;
  unidadesConVencidas: number;
};

export function metricasPlanes(filas: FilaPlanUnidad[], ahora: Date): MetricasPlanes {
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
  const inicioMesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1).getTime();
  const pendiente = { USD: 0, ARS: 0 };
  const saldadas = new Set<string>();
  const conVencidas = new Set<string>();

  for (const f of filas) {
    if (f.moneda === "USD" || f.moneda === "ARS") pendiente[f.moneda] += f.saldo;
    if (f.estado === "saldado" && f.ultimoPagoFecha) {
      const t = new Date(f.ultimoPagoFecha).getTime();
      if (t >= inicioMes && t < inicioMesSiguiente) saldadas.add(f.unidad.id);
    }
    if (f.tieneVencidas) conVencidas.add(f.unidad.id);
  }
  return { pendiente, unidadesSaldadasMes: saldadas.size, unidadesConVencidas: conVencidas.size };
}

/** Filtros de la grilla — "con_saldo" agrupa pendiente + en curso
 * ("por cobrar"/"por pagar"), "vencidas" y "semana" miran las cuotas. */
export const FILTRO_ESTADO_OPTIONS = [
  "todos",
  "sin_plan",
  "pendiente",
  "en_curso",
  "saldado",
  "con_saldo",
  "vencidas",
  "semana",
] as const;
export type FiltroEstadoPlan = (typeof FILTRO_ESTADO_OPTIONS)[number];

/** Opciones que se muestran en el selector — "con_saldo" y "semana" siguen
 * siendo filtros válidos (llegan por URL desde el dashboard) pero no se
 * listan salvo que estén activos. */
export const FILTRO_ESTADO_VISIBLES: readonly FiltroEstadoPlan[] = [
  "todos",
  "sin_plan",
  "pendiente",
  "en_curso",
  "saldado",
  "vencidas",
];

export const FILTRO_ESTADO_LABELS: Record<FiltroEstadoPlan, string> = {
  todos: "Todos los estados",
  sin_plan: "Sin plan",
  pendiente: "Pendiente",
  en_curso: "En curso",
  saldado: "Saldado",
  con_saldo: "Con saldo pendiente",
  vencidas: "Con cuotas vencidas",
  semana: "Vencen esta semana",
};

/** Normaliza el filtro de estado que llega por querystring, incluidos los
 * alias de links viejos (pagado → saldado, vencido → vencidas,
 * vence=semana → semana). */
export function filtroEstadoDesdeQuery(estado?: string, vence?: string): FiltroEstadoPlan {
  if (vence === "semana") return "semana";
  const ALIAS: Record<string, FiltroEstadoPlan> = { pagado: "saldado", vencido: "vencidas" };
  const e = estado ? (ALIAS[estado] ?? estado) : "todos";
  return (FILTRO_ESTADO_OPTIONS as readonly string[]).includes(e) ? (e as FiltroEstadoPlan) : "todos";
}

export function cumpleFiltroEstado(f: FilaPlanUnidad, filtro: FiltroEstadoPlan): boolean {
  switch (filtro) {
    case "todos":
      return true;
    case "con_saldo":
      return f.estado === "pendiente" || f.estado === "en_curso";
    case "vencidas":
      return f.tieneVencidas;
    case "semana":
      return f.venceEstaSemana;
    default:
      return f.estado === filtro;
  }
}

// ── Filtro por período de la grilla ──────────────────────────────────────

/** "todo" = sin filtro de período (vista por defecto: todas las unidades). */
export const FILTRO_PERIODO_OPTIONS = ["todo", "mes_actual", "mes_anterior", "trimestre", "personalizado"] as const;
export type FiltroPeriodo = (typeof FILTRO_PERIODO_OPTIONS)[number];

export const FILTRO_PERIODO_LABELS: Record<FiltroPeriodo, string> = {
  todo: "Todo el historial",
  mes_actual: "Este mes",
  mes_anterior: "Mes anterior",
  trimestre: "Este trimestre",
  personalizado: "Rango personalizado",
};

function claveDia(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Rango del filtro de período — null = todo el historial (o un rango
 * personalizado todavía incompleto). */
export function rangoDesdeFiltro(
  filtro: FiltroPeriodo,
  desde: string,
  hasta: string,
  ahora: Date
): { desde: Date; hasta: Date } | null {
  if (filtro === "todo") return null;
  if (filtro === "personalizado" && (!desde || !hasta)) return null;
  return calcularRangoPeriodo(filtro, ahora, desde, hasta);
}

/** ¿La fecha (un día de pago, guardado a medianoche UTC) cae en [desde,
 * hasta)? Se compara como "YYYY-MM-DD" — comparar instantes corría los
 * pagos al día anterior en Argentina. */
export function fechaEnRango(fechaIso: string, rango: { desde: Date; hasta: Date }): boolean {
  const dia = fechaIso.slice(0, 10);
  return dia >= claveDia(rango.desde) && dia < claveDia(rango.hasta);
}

/** Lo cobrado/pagado en un conjunto de planes dentro del rango. */
export function pagadoEnRangoPlanes(
  planes: AcuerdoConDetalle[],
  rango: { desde: Date; hasta: Date }
): { monto: number; cantidad: number } {
  let monto = 0;
  let cantidad = 0;
  for (const p of planes) {
    for (const m of p.movimientos) {
      if (fechaEnRango(m.fecha, rango)) {
        monto += m.importe;
        cantidad++;
      }
    }
  }
  return { monto, cantidad };
}

/** Lo cobrado/pagado en la unidad dentro de [desde, hasta). */
export function pagadoEnRango(
  fila: FilaPlanUnidad,
  rango: { desde: Date; hasta: Date }
): { monto: number; cantidad: number } {
  return pagadoEnRangoPlanes(fila.planes, rango);
}

/** "20/09/2026" — fecha completa (día de pago, en UTC), para exportar. */
export function fechaLarga(iso: string | null): string {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.slice(0, 10).split("-");
  return `${dd}/${mm}/${yyyy}`;
}

/** "20/09" — fecha corta para la grilla (día de pago, en UTC). */
export function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const [, mm, dd] = iso.slice(0, 10).split("-");
  return `${dd}/${mm}`;
}
