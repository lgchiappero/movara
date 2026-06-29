declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

export function trackPageView() {
  fbq("track", "PageView");
}

export function trackViewContent(modelo: string) {
  fbq("track", "ViewContent", { content_name: modelo, content_type: "product" });
}

export function trackLead(datos: { modelo: string; finalidad: string; provincia: string }) {
  fbq("track", "Lead", {
    content_name: datos.modelo,
    content_category: datos.finalidad,
    content_ids: [datos.provincia],
  });
}

export function trackInitiateCheckout() {
  fbq("track", "InitiateCheckout");
}

export function trackExitIntentLead() {
  fbq("track", "Lead", { source: "exit_intent" });
}
