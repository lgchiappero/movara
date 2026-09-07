import type { NextConfig } from "next";

// El resto de la política (script-src, style-src, etc.) es igual en todas
// las rutas — solo frame-ancestors varía, así que se arma con un builder en
// vez de duplicar todo el array por cada excepción de ruta.
function buildCsp(frameAncestors: string): string {
  return [
    "default-src 'self'",
    // Next.js requires unsafe-eval/unsafe-inline for client-side hydration
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://core.sanity-cdn.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
    "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://youtube.com https://*.youtube.com https://maps.google.com https://www.google.com https://www.facebook.com",
    "connect-src 'self' https://api.mercadopago.com https://www.facebook.com https://connect.facebook.net https://*.supabase.co https://api.sanity.io https://*.sanity.io",
    "form-action 'self' https://www.facebook.com",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

// frame-ancestors 'self': el sitio puede embeberse en iframes del propio
// origen (ej. /admin/contenido embebiendo /studio) pero no en sitios
// externos — sigue cubriendo la protección contra clickjacking.
const CSP = buildCsp("'self'");

// X-Frame-Options se eliminó: frame-ancestors en el CSP ya cubre la
// protección contra clickjacking, y evita el conflicto con los iframes
// externos (YouTube, Maps) que sí queremos poder embeber via frame-src.
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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
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
