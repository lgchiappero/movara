import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

export default function ModelosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
