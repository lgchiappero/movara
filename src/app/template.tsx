import PageTransition from "@/components/motion/PageTransition";

// template (no layout) porque se remonta en cada navegación — es lo que le
// da a AnimatePresence un hijo nuevo con otra key para animar la entrada.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
