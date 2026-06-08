import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import WizardModal from "@/components/wizard/WizardModal";
import { SanityLive } from "@/sanity/lib/live";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY } from "@/sanity/lib/queries";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    title: config?.metaTitle ?? "Habitatt — Casas Modulares de Calidad",
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
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-stone-900">
        {children}
        <WizardModal waNumber={waNumber} />
        <SanityLive />
      </body>
    </html>
  );
}
