type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (store.size % 100 === 0) cleanup();
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  entry.count++;

  if (entry.count === MAX_REQUESTS + 1) {
    console.warn(`[rate-limit] IP ${ip} exceeded ${MAX_REQUESTS} req/min`);
  }

  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "127.0.0.1";
}
