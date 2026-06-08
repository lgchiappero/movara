import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import SocialProof from "@/components/home/SocialProof";
import WhyHabitatt from "@/components/home/WhyHabitatt";
import FeaturedModels from "@/components/home/FeaturedModels";
import UsosPerfiles from "@/components/home/UsosPerfiles";
import ProcessSteps from "@/components/home/ProcessSteps";
import Testimonials from "@/components/home/Testimonials";
import CTAFinal from "@/components/home/CTAFinal";
import Footer from "@/components/home/Footer";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY, HOME_PAGE_QUERY } from "@/sanity/lib/queries";

async function getPageData() {
  try {
    const [config, homePage] = await Promise.all([
      client.fetch<{ whatsappNumber?: string | null }>(SITE_CONFIG_QUERY),
      client.fetch(HOME_PAGE_QUERY),
    ]);
    return { waNumber: config?.whatsappNumber ?? null, homePage };
  } catch {
    return { waNumber: null, homePage: null };
  }
}

export default async function HomePage() {
  const { waNumber, homePage } = await getPageData();

  return (
    <>
      <Navbar />
      <main>
        <Hero waNumber={waNumber} data={homePage?.hero} />
        <SocialProof />
        <WhyHabitatt data={homePage?.whyHabitatt} />
        <FeaturedModels />
        <UsosPerfiles data={homePage?.usos} />
        <ProcessSteps data={homePage?.process} />
        <Testimonials />
        <CTAFinal waNumber={waNumber} data={homePage?.cta} />
      </main>
      <Footer />
    </>
  );
}
