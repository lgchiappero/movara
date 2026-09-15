// Rate limiting de intentos fallidos de login, por IP. Mismo patrón de Map
// en memoria que src/lib/rate-limit.ts (usado por /api/pedido y /api/leads),
// pero con semántica distinta: no cuenta requests/minuto, cuenta intentos
// FALLIDOS y bloquea por un tiempo fijo tras superar el máximo. Limitación
// conocida y aceptada, igual que el resto de la app: no persiste entre cold
// starts ni se comparte perfectamente entre instancias serverless.

type Entry = { failCount: number; lockedUntil: number | null };

const store = new Map<string, Entry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.lockedUntil !== null && entry.lockedUntil <= now) store.delete(key);
  }
}

export function isLockedOut(ip: string): boolean {
  const entry = store.get(ip);
  if (!entry?.lockedUntil) return false;
  return entry.lockedUntil > Date.now();
}

export function recordFailedAttempt(ip: string): void {
  const entry = store.get(ip) ?? { failCount: 0, lockedUntil: null };
  entry.failCount += 1;
  if (entry.failCount >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  store.set(ip, entry);
  if (store.size % 100 === 0) cleanup();
}

export function resetAttempts(ip: string): void {
  store.delete(ip);
}
