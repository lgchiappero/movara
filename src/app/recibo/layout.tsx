import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";

// El layout global solo carga Playfair en italic; el título del recibo va
// en Playfair normal.
const playfair = Playfair_Display({
  variable: "--font-playfair-recibo",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recibo en Conformidad — MOVARA",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ReciboLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} min-h-screen bg-[#1A1A1A] text-stone-200`}>
      {/* El body global es blanco y tiene padding inferior para la barra de
          WhatsApp (oculta en /recibo): sin esto quedaría una franja blanca. */}
      <style>{`body{background:#1A1A1A}`}</style>
      {children}
    </div>
  );
}
