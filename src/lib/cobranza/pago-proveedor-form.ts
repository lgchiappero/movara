import { pagoProveedorSchema, type PagoProveedorInput } from "@/lib/validators/cobranza";
import { validateFileMovara } from "@/lib/admin/file-validation";
import { buildStoragePath, uploadDocument, BUCKET_MOVARA } from "@/lib/admin/storage";

type Resultado<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

/** Lee y valida el multipart de alta/edición de un pago a proveedor. */
export function leerPagoProveedor(form: FormData): Resultado<{ data: PagoProveedorInput; comprobante: File | null }> {
  const campo = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = pagoProveedorSchema.safeParse({
    proveedor: campo("proveedor") ?? "",
    concepto: campo("concepto"),
    descripcion: campo("descripcion") ?? null,
    moneda: campo("moneda"),
    importe: campo("importe"),
    fecha: campo("fecha") ?? "",
    estado: campo("estado"),
    modalidad: campo("modalidad") || undefined,
    notas: campo("notas") ?? null,
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

/** Sube el comprobante a Storage y devuelve su path. */
export async function subirComprobante(file: File, carpetaId: string): Promise<Resultado<string>> {
  const validation = validateFileMovara({ size: file.size, type: file.type });
  if (!validation.valid) return { ok: false, error: validation.error ?? "Archivo inválido", status: 400 };
  const path = buildStoragePath("pagos", carpetaId, file.name);
  try {
    await uploadDocument(BUCKET_MOVARA, path, await file.arrayBuffer(), file.type);
  } catch (err) {
    console.error("[pagos/comprobante]", err);
    return { ok: false, error: "No pudimos subir el comprobante", status: 500 };
  }
  return { ok: true, value: path };
}
