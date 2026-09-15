import bcrypt from "bcryptjs";

const ROUNDS = 12;

// Hash válido pero sin usuario real detrás — se compara contra este cuando
// el email no existe, para que el tiempo de respuesta y el resultado de
// bcrypt.compare no delaten si un email está registrado o no.
const DUMMY_HASH = "$2b$12$MU/URtAttDomCuZRY49eVOOamVfZy12OajBQtFWDW.CNvshtP1axq";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH);
}
