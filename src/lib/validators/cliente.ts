import { z } from "zod";

const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" || v === null ? null : v));

// Cliente interno cargado a mano por el admin — sin el nivel de validación
// estricta del configurador público (DNI/CUIT/teléfono en formatos que
// varían mucho caso a caso, no vale la pena forzar un regex acá).
export const clienteSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(150, "Máximo 150 caracteres"),
  dni: stringOrNull,
  cuit: stringOrNull,
  domicilio: stringOrNull,
  email: stringOrNull,
  telefono: stringOrNull,
  notas: stringOrNull,
});

export type ClienteInput = z.infer<typeof clienteSchema>;
