import { z } from "zod";
import {
  modeloOptions,
  finalidadOptions,
  tipoCocinaOptions,
  tipoAguaOptions,
  lavarropasOptions,
} from "@/lib/validators/pedido";
import { ADMIN_EXTRAS } from "@/data/admin-extras";

const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" ? null : v));

// Keys de los selectores de "Materiales seleccionados" editables como texto
// libre desde el admin — ver MATERIAL_CATEGORY_GROUPS en material-catalog.ts.
export const materialesTextoKeys = [
  "exterior",
  "piso",
  "panelesBano",
  "puertaBano",
  "cocina",
  "mesada",
  "puertaPrincipal",
  "ventanas",
] as const;

const adminExtraKeys = ADMIN_EXTRAS.map((e) => e.key) as [string, ...string[]];

// z.record con una key schema de tipo enum exige las 8 keys presentes
// (record "exhaustivo") — como el form siempre las manda todas, pero
// preferimos no acoplar la validación a esa exhaustividad implícita, un
// z.object plano con las 8 keys fijas es más simple y explícito.
const materialesTextoSchema = z.object(
  Object.fromEntries(materialesTextoKeys.map((k) => [k, stringOrNull])) as Record<
    (typeof materialesTextoKeys)[number],
    typeof stringOrNull
  >
);

export const configuracionEspacioSchema = z.object({
  modelo: z.union([z.enum(modeloOptions), z.null()]),
  finalidad: z.union([z.enum(finalidadOptions), z.null()]),
  provincia: stringOrNull,
  localidad: stringOrNull,
  habitaciones: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]),
  incluyeCocina: z.boolean(),
  tipoCocina: z.union([z.enum(tipoCocinaOptions), z.null()]),
  incluyeBano: z.boolean(),
  tipoAgua: z.union([z.enum(tipoAguaOptions), z.null()]),
  lavarropas: z.union([z.enum(lavarropasOptions), z.null()]),
  materiales: materialesTextoSchema,
  upgrades: z.array(z.enum(adminExtraKeys)),
  notasConfiguracion: stringOrNull,
});

export type ConfiguracionEspacioInput = z.infer<typeof configuracionEspacioSchema>;
