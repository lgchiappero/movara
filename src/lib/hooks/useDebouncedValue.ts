"use client";

import { useEffect, useState } from "react";

/** Devuelve `value`, pero actualizado solo 300ms (configurable) después
 * de que deja de cambiar — usado en inputs de búsqueda que filtran
 * listas en memoria, para no recalcular el filtro en cada tecla. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
