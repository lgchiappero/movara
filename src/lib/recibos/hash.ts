import { createHash } from "crypto";
import { TEXTO_RECIBO_VERSION } from "./texto";

/** Todo lo que el cliente confirmó más la evidencia de la confirmación. */
export type ContenidoHash = {
  numeroRecibo: string;
  textoConfirmado: string;
  clienteNombre: string;
  clienteDni: string | null;
  clienteCuit: string | null;
  clienteEmail: string;
  numeroUnidad: string;
  modelo: string;
  fechaEntrega: Date;
  lugarEntrega: string;
  observaciones: string | null;
  confirmadoAt: Date;
  ipConfirmacion: string | null;
  userAgent: string | null;
};

/** SHA-256 sobre un JSON con orden de claves fijo (no depende del orden en
 * que se armó el objeto) — recalculable en cualquier momento para verificar
 * que el recibo guardado no se modificó. */
export function calcularHashRecibo(c: ContenidoHash): string {
  const canonico = JSON.stringify([
    ["version", TEXTO_RECIBO_VERSION],
    ["numeroRecibo", c.numeroRecibo],
    ["textoConfirmado", c.textoConfirmado],
    ["clienteNombre", c.clienteNombre],
    ["clienteDni", c.clienteDni],
    ["clienteCuit", c.clienteCuit],
    ["clienteEmail", c.clienteEmail],
    ["numeroUnidad", c.numeroUnidad],
    ["modelo", c.modelo],
    ["fechaEntrega", c.fechaEntrega.toISOString()],
    ["lugarEntrega", c.lugarEntrega],
    ["observaciones", c.observaciones],
    ["confirmadoAt", c.confirmadoAt.toISOString()],
    ["ipConfirmacion", c.ipConfirmacion],
    ["userAgent", c.userAgent],
  ]);
  return createHash("sha256").update(canonico, "utf8").digest("hex");
}

/** "a1b2c3d4…e5f6a7b8" — para mostrar en pantallas chicas. */
export function hashAbreviado(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;
}
