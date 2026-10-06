"use client";

import { MotionConfig } from "framer-motion";

/** reducedMotion="user": si el sistema pide prefers-reduced-motion, Framer
 * Motion desactiva las animaciones de transform/layout en todo el árbol
 * (los fades de opacidad siguen, son seguros). Cubre también los
 * whileInView que ya existían en cada sección. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
