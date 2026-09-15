import { describe, it, expect, afterEach, vi } from "vitest";
import { isLockedOut, recordFailedAttempt, resetAttempts } from "@/lib/admin/login-rate-limit";

// Cada test usa una IP única (no hay reset global del Map interno) para no
// contaminarse entre sí — mismo criterio que el resto de los tests de
// rate-limiting en este proyecto.
let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("login-rate-limit", () => {
  it("no bloquea antes de llegar al máximo de intentos", () => {
    const ip = freshIp();
    for (let i = 0; i < 4; i++) recordFailedAttempt(ip);
    expect(isLockedOut(ip)).toBe(false);
  });

  it("bloquea al llegar al 5to intento fallido", () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
    expect(isLockedOut(ip)).toBe(true);
  });

  it("resetAttempts (login exitoso) limpia el bloqueo", () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
    expect(isLockedOut(ip)).toBe(true);
    resetAttempts(ip);
    expect(isLockedOut(ip)).toBe(false);
  });

  it("el bloqueo se levanta solo después de 15 minutos", () => {
    vi.useFakeTimers();
    const ip = freshIp();
    for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
    expect(isLockedOut(ip)).toBe(true);

    vi.advanceTimersByTime(14 * 60_000);
    expect(isLockedOut(ip)).toBe(true);

    vi.advanceTimersByTime(2 * 60_000);
    expect(isLockedOut(ip)).toBe(false);
  });

  it("IPs distintas no se afectan entre sí", () => {
    const ipA = freshIp();
    const ipB = freshIp();
    for (let i = 0; i < 5; i++) recordFailedAttempt(ipA);
    expect(isLockedOut(ipA)).toBe(true);
    expect(isLockedOut(ipB)).toBe(false);
  });
});
