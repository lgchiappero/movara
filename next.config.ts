import type { NextConfig } from "next";

// El resto de la política (script-src, style-src, etc.) es igual en todas
// las rutas — solo frame-ancestors varía, así que se arma con un builder en
// vez de duplicar todo el array por cada excepción de ruta.
// 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir los
// errores del servidor en el navegador; en producción ni React ni Next usan
// eval (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// 'unsafe-inline' sigue en script-src: las páginas públicas son estáticas
// (ISR) y un nonce obligaría a renderizarlas en cada request (fase 3 de
// seguridad: nonces solo en las rutas que ya son dinámicas).
const EVAL_SOLO_DEV = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

function buildCsp(frameAncestors: string, extraScript = ""): string {
  return [
    "default-src 'self'",
    `script-src 'self'${EVAL_SOLO_DEV}${extraScript} 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://core.sanity-cdn.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
    "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://youtube.com https://*.youtube.com https://maps.google.com https://www.google.com https://www.facebook.com",
    "connect-src 'self' https://www.facebook.com https://connect.facebook.net https://*.supabase.co https://api.sanity.io https://*.sanity.io",
    "form-action 'self' https://www.facebook.com",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

// frame-ancestors 'self': el sitio puede embeberse en iframes del propio
// origen (ej. /admin/contenido embebiendo /studio) pero no en sitios
// externos — sigue cubriendo la protección contra clickjacking.
const CSP = buildCsp("'self'");

// Sin X-Frame-Options en el sitio público: frame-ancestors en el CSP ya
// cubre el clickjacking (los iframes externos de YouTube y Maps los regula
// frame-src). En /admin sí va, ver ADMIN_SECURITY_HEADERS.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Content-Security-Policy", value: CSP },
];

// Excepción explícita para /studio: se embebe dentro de /admin/contenido y
// /admin/modelos (mismo origen). Queda como regla propia — independiente
// del default general — para que no dependa de que nadie vuelva a
// endurecer ese default más adelante.
const STUDIO_SECURITY_HEADERS = [
  ...SECURITY_HEADERS.filter((h) => h.key !== "Content-Security-Policy"),
  { key: "Content-Security-Policy", value: buildCsp("'self'") },
];

// El panel admin no se embebe en ningún lado (ni en el propio sitio):
// frame-ancestors 'none' + X-Frame-Options para navegadores viejos. COOP
// aísla la ventana del admin de cualquier otra que la haya abierto.
const ADMIN_SECURITY_HEADERS = [
  ...SECURITY_HEADERS.filter((h) => h.key !== "Content-Security-Policy"),
  { key: "Content-Security-Policy", value: buildCsp("'none'") },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // El indicador de desarrollo de Next (la "N" abajo a la izquierda) tapa
  // botones del sitio en los e2e (ej. "Atrás" del configurador en el
  // celular). Playwright levanta el servidor con E2E_SIN_INDICADOR=1.
  ...(process.env.E2E_SIN_INDICADOR === "1" ? { devIndicators: false as const } : {}),
  images: {
    // 85: la foto del Hero (Next 16 solo permite 75 por defecto).
    qualities: [75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  async redirects() {
    return [
      // La página "Quiénes somos" pasó a /nosotros: 308 para no perder links viejos.
      { source: "/quienes-somos", destination: "/nosotros", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/admin/:path*",
        headers: ADMIN_SECURITY_HEADERS,
      },
      {
        source: "/admin",
        headers: ADMIN_SECURITY_HEADERS,
      },
      {
        // Excepción de frame-ancestors para que /studio pueda embeberse
        // dentro del panel admin (/admin/contenido, /admin/modelos).
        source: "/studio/:path*",
        headers: STUDIO_SECURITY_HEADERS,
      },
      {
        // Página estática con ISR (revalidate: 3600) — permite que el CDN
        // sirva la respuesta cacheada y la revalide en background.
        source: "/configurador",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
