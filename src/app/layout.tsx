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

export const metadata: Metadata = {
  title: "Habitatt — Casas Modulares de Calidad",
  description:
    "Diseñamos, fabricamos y entregamos casas modulares sustentables en toda la Argentina. Llave en mano.",
};

async function getWaNumber(): Promise<string | null> {
  try {
    const data = await client.fetch<{ whatsappNumber?: string | null }>(SITE_CONFIG_QUERY);
    return data?.whatsappNumber ?? null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const waNumber = await getWaNumber();

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
