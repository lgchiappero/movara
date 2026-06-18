import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

export default function ConfiguradorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
