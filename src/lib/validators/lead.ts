import { z } from "zod";

export const leadContactadoSchema = z.object({
  contactado: z.boolean(),
});
export type LeadContactadoInput = z.infer<typeof leadContactadoSchema>;
