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
import { SITE_CONFIG_QUERY } from "@/sanity/lib/queries";

async function getWaNumber(): Promise<string | null> {
  try {
    const data = await client.fetch<{ whatsappNumber?: string | null }>(SITE_CONFIG_QUERY);
    return data?.whatsappNumber ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const waNumber = await getWaNumber();

  return (
    <>
      <Navbar />
      <main>
        <Hero waNumber={waNumber} />
        <SocialProof />
        <WhyHabitatt />
        <FeaturedModels />
        <UsosPerfiles />
        <ProcessSteps />
        <Testimonials />
        <CTAFinal waNumber={waNumber} />
      </main>
      <Footer />
    </>
  );
}
