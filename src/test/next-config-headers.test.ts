import { describe, it, expect, vi, afterEach } from "vitest";

type Regla = { source: string; headers: { key: string; value: string }[] };

/** Headers de seguridad de next.config.ts (CSP y anti-clickjacking). Se
 * importa de nuevo en cada caso: 'unsafe-eval' depende de NODE_ENV al cargar. */
async function reglas(nodeEnv: string): Promise<Regla[]> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  const { default: config } = await import("../../next.config");
  return (await config.headers!()) as Regla[];
}

const header = (r: Regla[], source: string, key: string) =>
  r.find((x) => x.source === source)?.headers.find((h) => h.key === key)?.value;

const directiva = (csp: string | undefined, nombre: string) =>
  csp?.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${nombre} `));

afterEach(() => vi.unstubAllEnvs());

describe("CSP y headers de seguridad (next.config.ts)", () => {
  it("producción: script-src sin 'unsafe-eval', con Meta Pixel y el Studio de Sanity", async () => {
    const r = await reglas("production");
    for (const source of ["/:path*", "/admin/:path*", "/studio/:path*"]) {
      const scripts = directiva(header(r, source, "Content-Security-Policy"), "script-src");
      expect(scripts, source).toBeDefined();
      expect(scripts, source).not.toContain("'unsafe-eval'");
      expect(scripts).toContain("https://connect.facebook.net");
      expect(scripts).toContain("https://core.sanity-cdn.com");
    }
  });

  it("desarrollo: 'unsafe-eval' (React lo usa para los errores del servidor)", async () => {
    const r = await reglas("development");
    expect(directiva(header(r, "/:path*", "Content-Security-Policy"), "script-src")).toContain("'unsafe-eval'");
  });

  it("sin Mercado Pago, con YouTube y Google Maps en frame-src", async () => {
    const csp = header(await reglas("production"), "/:path*", "Content-Security-Policy");
    expect(csp).not.toContain("mercadopago");
    const frames = directiva(csp, "frame-src");
    expect(frames).toContain("https://www.youtube-nocookie.com");
    expect(frames).toContain("https://maps.google.com");
  });

  it("/admin: no se puede embeber (frame-ancestors 'none' + X-Frame-Options) y aísla la ventana (COOP)", async () => {
    const r = await reglas("production");
    for (const source of ["/admin", "/admin/:path*"]) {
      expect(directiva(header(r, source, "Content-Security-Policy"), "frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(header(r, source, "X-Frame-Options")).toBe("DENY");
      expect(header(r, source, "Cross-Origin-Opener-Policy")).toBe("same-origin");
      expect(header(r, source, "Strict-Transport-Security")).toContain("max-age=");
    }
  });

  it("/studio y el sitio: embebibles solo por el propio origen (el admin embebe el Studio)", async () => {
    const r = await reglas("production");
    expect(directiva(header(r, "/studio/:path*", "Content-Security-Policy"), "frame-ancestors")).toBe("frame-ancestors 'self'");
    expect(directiva(header(r, "/:path*", "Content-Security-Policy"), "frame-ancestors")).toBe("frame-ancestors 'self'");
    expect(header(r, "/:path*", "X-Frame-Options")).toBeUndefined();
  });
});
