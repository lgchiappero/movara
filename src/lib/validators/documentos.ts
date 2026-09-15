export const tipoDocumentoOptions = [
  "comprobante_pago",
  "pi_proveedor",
  "bl",
  "seguro",
  "inspeccion",
  "otro",
] as const;
export type TipoDocumento = (typeof tipoDocumentoOptions)[number];

export const tipoDocumentoLabels: Record<TipoDocumento, string> = {
  comprobante_pago: "Comprobante de pago",
  pi_proveedor: "PI del proveedor",
  bl: "BL",
  seguro: "Seguro",
  inspeccion: "Inspección",
  otro: "Otro",
};

// Campos escalares de ConfiguracionPedido que un documento puede también
// completar de una — así "subir PI" en Gestión comercial hace una sola
// operación (crea el DocumentoPedido Y setea piUrl), no dos.
export const campoDestinoOptions = [
  "piUrl",
  "comprobantePagoUrl",
  "comprobanteSaldoUrl",
  "seguroUrl",
  "inspeccionUrl",
  "fotosUrl",
] as const;
export type CampoDestino = (typeof campoDestinoOptions)[number];
