"use client";

import { Component, type ReactNode } from "react";
import DatoNoDisponible from "./DatoNoDisponible";

/** Error boundary para las secciones de cliente del detalle del pedido: si
 *  una falla, esa parte muestra "Dato no disponible" y el resto sigue. */
export default class SeccionSegura extends Component<{ titulo: string; children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(err: unknown) {
    console.error(`[admin] Falló la sección "${this.props.titulo}":`, err);
  }

  render() {
    return this.state.error ? <DatoNoDisponible titulo={this.props.titulo} /> : this.props.children;
  }
}
