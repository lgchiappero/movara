import { costoLogisticaSchema, type CostoLogisticaInput } from "@/lib/validators/cobranza";

type Resultado<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

/** Lee y valida el multipart de alta/edición de un costo de logística. */
export function leerCostoLogistica(form: FormData): Resultado<{ data: CostoLogisticaInput; comprobante: File | null }> {
  const campo = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = costoLogisticaSchema.safeParse({
    concepto: campo("concepto"),
    descripcion: campo("descripcion") ?? null,
    moneda: campo("moneda"),
    importe: campo("importe"),
    fecha: campo("fecha") ?? "",
    estado: campo("estado"),
    notas: campo("notas") ?? null,
    prorratear: campo("prorratear") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos", status: 400 };
  }
  const file = form.get("comprobante");
  const comprobante = file instanceof File && file.size > 0 ? file : null;
  if (comprobante && parsed.data.estado !== "pagado") {
    return { ok: false, error: "El comprobante solo se adjunta a un pago ya realizado", status: 400 };
  }
  return { ok: true, value: { data: parsed.data, comprobante } };
}
