import { z } from "zod";

const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" || v === null ? null : v));
const numberOrNull = z.union([z.number(), z.null()]);
const dateOrNull = z.union([z.string(), z.null()]).transform((v) => (v ? new Date(v) : null));

export const envioSchema = z.object({
  numeroPI: stringOrNull,
  numeroBL: stringOrNull,
  numeroContenedor: stringOrNull,

  fechaEmbarque: dateOrNull,
  fechaArriboEstimado: dateOrNull,
  fechaArribo: dateOrNull,

  costoPI: numberOrNull,
  costoFlete: numberOrNull,
  costoSeguro: numberOrNull,
  costoAduana: numberOrNull,
  costoOtrosInternacional: numberOrNull,

  notas: stringOrNull,
});

export type EnvioInput = z.infer<typeof envioSchema>;
