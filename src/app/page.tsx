import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import DolorConvencional from "@/components/home/DolorConvencional";
import NuevaCategoria from "@/components/home/NuevaCategoria";
import ModelosHome from "@/components/home/ModelosHome";
import Preventa from "@/components/home/Preventa";
import DossierForm from "@/components/home/DossierForm";
import ComoFunciona from "@/components/home/ComoFunciona";
import PruebaSocial from "@/components/home/PruebaSocial";
import ContactoForm from "@/components/home/ContactoForm";
import ConfiguradorRegional from "@/components/configurador/ConfiguradorRegional";
import Footer from "@/components/home/Footer";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY } from "@/sanity/lib/queries";

async function getPageData() {
  try {
    const config = await client.fetch<{ whatsappNumber?: string | null }>(SITE_CONFIG_QUERY);
    return { waNumber: config?.whatsappNumber ?? null };
  } catch {
    return { waNumber: null };
  }
}

export default async function HomePage() {
  const { waNumber } = await getPageData();

  return (
    <>
      <Navbar />
      <ConfiguradorRegional waNumber={waNumber} />
      <main>
        <Hero waNumber={waNumber} />
        <DolorConvencional />
        <NuevaCategoria />
        <ModelosHome />
        <Preventa />
        <DossierForm waNumber={waNumber} />
        <ComoFunciona />
        <PruebaSocial />
        <ContactoForm waNumber={waNumber} />
      </main>
      <Footer />
    </>
  );
}
