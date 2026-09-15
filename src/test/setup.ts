import "@testing-library/jest-dom";

// Algunos archivos de test fuerzan entorno Node (`@vitest-environment node`)
// para código server-only que no puede correr bajo jsdom (ej. jose, cuyo
// build webapi choca con el realm de Uint8Array de jsdom) — este setup
// global corre igual para esos archivos, así que el parche de DOM queda
// detrás de este guard (el import de jest-dom de arriba no toca el DOM al
// importar, solo registra matchers).
if (typeof document !== "undefined") {
  // jsdom no implementa scrollIntoView; varios componentes lo usan para
  // mantener visible un elemento seleccionado (ej. thumbnail activo).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
