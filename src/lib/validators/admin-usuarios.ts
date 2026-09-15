import { z } from "zod";
import { adminRoles } from "@/lib/admin/roles";

export const nuevoUsuarioSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  rol: z.enum(adminRoles),
});

export const editarUsuarioSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100).optional(),
  rol: z.enum(adminRoles).optional(),
  activo: z.boolean().optional(),
});

export const MAX_USUARIOS = 5;
