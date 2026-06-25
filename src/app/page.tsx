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
import { SITE_CONFIG_QUERY, HOME_PAGE_QUERY, HOME_MODELOS_QUERY } from "@/sanity/lib/queries";

async function getPageData() {
  try {
    const [config, homePage, modelos] = await Promise.all([
      client.fetch<{ whatsappNumber?: string | null }>(SITE_CONFIG_QUERY),
      client.fetch(HOME_PAGE_QUERY),
      client.fetch(HOME_MODELOS_QUERY),
    ]);
    return {
      waNumber: config?.whatsappNumber ?? null,
      homePage: homePage ?? null,
      modelos: modelos ?? null,
    };
  } catch {
    return { waNumber: null, homePage: null, modelos: null };
  }
}

export default async function HomePage() {
  const { waNumber, homePage, modelos } = await getPageData();

  return (
    <>
      <Navbar />
      <ConfiguradorRegional waNumber={waNumber} />
      <main>
        <Hero waNumber={waNumber} content={homePage?.hero} />
        <DolorConvencional content={homePage?.dolorConvencional} />
        <NuevaCategoria content={homePage?.nuevaCategoria} />
        <ModelosHome content={homePage?.modelosHome} modelos={modelos} />
        <Preventa content={homePage?.preventa} />
        <DossierForm waNumber={waNumber} content={homePage?.dossier} />
        <ComoFunciona content={homePage?.comoFunciona} />
        <PruebaSocial content={homePage?.pruebaSocial} />
        <ContactoForm waNumber={waNumber} content={homePage?.formularioContacto} />
      </main>
      <Footer />
    </>
  );
}
