import type { Metadata } from "next";
import { Montserrat, Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";
import BackToTop from "@/components/ui/BackToTop";
import WhatsAppStickyBar from "@/components/ui/WhatsAppStickyBar";
import { MetaPixel } from "@/components/MetaPixel";
import MotionProvider from "@/components/motion/MotionProvider";
import { SanityLive } from "@/sanity/lib/live";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY, CUPOS_QUERY } from "@/sanity/lib/queries";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  // normal: títulos de las cards de modelos; italic: frases destacadas.
  style: ["normal", "italic"],
  weight: ["500", "600"],
  display: "swap",
});

type SiteConfig = {
  whatsappNumber?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
};

async function getSiteConfig(): Promise<SiteConfig | null> {
  try {
    return await client.fetch<SiteConfig>(SITE_CONFIG_QUERY);
  } catch {
    return null;
  }
}

type CuposConfig = { totalUnidades?: number | null; unidadesReservadas?: number | null };

async function getCupos(): Promise<CuposConfig | null> {
  try {
    return await client.fetch<CuposConfig>(CUPOS_QUERY);
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return {
    title: config?.metaTitle ?? "MOVARA — Casas Modulares de Calidad",
    description:
      config?.metaDescription ??
      "Casas modulares de diseño, llave en mano, con entrega en toda la Argentina.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, cupos] = await Promise.all([getSiteConfig(), getCupos()]);
  const waNumber = config?.whatsappNumber ?? null;

  return (
    <html lang="es" className={`${montserrat.variable} ${poppins.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-stone-900 pb-24 sm:pb-20">
        <MetaPixel vercelEnv={process.env.VERCEL_ENV} />
        <MotionProvider>
          {children}
          <WhatsAppStickyBar
            waNumber={waNumber}
            total={cupos?.totalUnidades ?? 20}
            reservadas={cupos?.unidadesReservadas ?? 7}
          />
          <BackToTop />
        </MotionProvider>
        {process.env.SANITY_API_TOKEN && <SanityLive />}
      </body>
    </html>
  );
}
