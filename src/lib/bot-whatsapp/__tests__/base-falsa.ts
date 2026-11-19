/* eslint-disable @typescript-eslint/no-explicit-any -- base falsa de tests: las filas van sin tipar a propósito */
/** Base en memoria con lo justo que usan procesar.ts y el webhook. */
type Fila = Record<string, any>;

let secuencia = 0;
const nuevoId = () => `id${++secuencia}`;

function aplicar(fila: Fila, data: Fila) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && "increment" in v) fila[k] = (fila[k] ?? 0) + v.increment;
    else fila[k] = v;
  }
}

function cumple(fila: Fila, where: Fila): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Fila[]).some((w) => cumple(fila, w));
    if (v && typeof v === "object" && !(v instanceof Date) && "lt" in v) return fila[k] instanceof Date && fila[k] < v.lt;
    if (v instanceof Date) return fila[k]?.getTime() === v.getTime();
    return (fila[k] ?? null) === v;
  });
}

export function crearBaseFalsa() {
  const t = { leads: [] as Fila[], mensajes: [] as Fila[], excluidos: [] as Fila[], uso: [] as Fila[], config: null as Fila | null };
  let reloj = 0;
  const db = {
    configBot: {
      upsert: async ({ create }: Fila) => (t.config ??= { ...create, activo: false, modoHorario: false, modoRespaldo: "MENSAJE_BIENVENIDA", topeGastoMensualUsd: 5, emailAviso: null, maxRespuestasPorLead: 6 }),
    },
    usoBot: {
      findUnique: async ({ where }: Fila) => t.uso.find((u) => u.mes === where.mes) ?? null,
      upsert: async ({ where, create, update }: Fila) => {
        const f = t.uso.find((u) => u.mes === where.mes);
        if (f) {
          aplicar(f, update);
          return f;
        }
        const n = { avisoOchentaEn: null, ...create };
        t.uso.push(n);
        return n;
      },
      updateMany: async ({ where, data }: Fila) => {
        const fs = t.uso.filter((u) => cumple(u, where));
        fs.forEach((f) => aplicar(f, data));
        return { count: fs.length };
      },
    },
    contactoExcluido: { findUnique: async ({ where }: Fila) => t.excluidos.find((e) => e.telefono === where.telefono) ?? null },
    leadWhatsapp: {
      findUnique: async ({ where }: Fila) => t.leads.find((l) => l.id === where.id) ?? null,
      update: async ({ where, data }: Fila) => {
        const l = t.leads.find((x) => x.id === where.id);
        if (!l) throw Object.assign(new Error("no existe"), { code: "P2025" });
        aplicar(l, data);
        return l;
      },
      updateMany: async ({ where, data }: Fila) => {
        const fs = t.leads.filter((l) => cumple(l, where));
        fs.forEach((f) => aplicar(f, data));
        return { count: fs.length };
      },
      upsert: async ({ where, create, update }: Fila) => {
        const l = t.leads.find((x) => x.telefono === where.telefono);
        if (l) {
          aplicar(l, update);
          return l;
        }
        return crearLead(create);
      },
    },
    mensajeWhatsapp: {
      findUnique: async ({ where }: Fila) => t.mensajes.find((x) => x.waMessageId === where.waMessageId) ?? null,
      findFirst: async ({ where }: Fila) => [...t.mensajes].filter((x) => cumple(x, where)).sort((a, b) => b.orden - a.orden)[0] ?? null,
      findMany: async ({ where, take }: Fila) => [...t.mensajes].filter((x) => cumple(x, where)).sort((a, b) => b.orden - a.orden).slice(0, take),
      create: async ({ data }: Fila) => {
        if (data.waMessageId && t.mensajes.some((x) => x.waMessageId === data.waMessageId)) throw Object.assign(new Error("único"), { code: "P2002" });
        const n = { id: nuevoId(), orden: ++reloj, waMessageId: null, estadoEntrega: null, ...data };
        t.mensajes.push(n);
        return n;
      },
      updateMany: async ({ where, data }: Fila) => {
        const fs = t.mensajes.filter((x) => cumple(x, where));
        fs.forEach((f) => aplicar(f, data));
        return { count: fs.length };
      },
    },
  };

  function crearLead(datos: Fila = {}): Fila {
    const l = {
      id: nuevoId(),
      telefono: "5493490000001",
      nombre: null,
      uso: null,
      zona: null,
      terreno: null,
      personas: null,
      plazo: null,
      origen: null,
      origenDetalle: null,
      estado: "NUEVO",
      controlHumano: false,
      respuestasBot: 0,
      bloqueoHasta: null,
      bienvenidaEnviadaEn: null,
      ultimoEntranteEn: null,
      ultimoMensajeEn: null,
      ...datos,
    };
    t.leads.push(l);
    return l;
  }

  return { db, tablas: t, crearLead };
}
