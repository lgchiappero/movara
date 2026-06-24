import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import WizardModal from "@/components/wizard/WizardModal";
import WhatsAppFAB from "@/components/WhatsAppFAB";
import { MetaPixelPageView } from "@/components/MetaPixelPageView";
import { SanityLive } from "@/sanity/lib/live";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY } from "@/sanity/lib/queries";

const META_PIXEL_ID = "996322016615557";

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

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return {
    title: config?.metaTitle ?? "MOVARA — Casas Modulares de Calidad",
    description:
      config?.metaDescription ??
      "Diseñamos, fabricamos y entregamos casas modulares sustentables en toda la Argentina. Llave en mano.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();
  const waNumber = config?.whatsappNumber ?? null;

  return (
    <html lang="es" className={`${montserrat.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-stone-900">
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {children}
        <WizardModal waNumber={waNumber} />
        <WhatsAppFAB />
        <SanityLive />
        <MetaPixelPageView />
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
          }}
        />
      </body>
    </html>
  );
}
