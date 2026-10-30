import path from "path";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";
import { buildPedidoNarrativeEs } from "@/lib/pdf/pedido-narrative-es";
import { pedidoPdfStyles as styles } from "@/lib/pdf/pedido-pdf-styles";
import type { DesgloseEstimado } from "@/lib/precio-configurador";
import { A_CONSULTAR, LEYENDA_PRECIOS } from "@/data/precios-extras";

const logoPath = path.join(process.cwd(), "public", "Logo.jpeg");

type Props = {
  data: PedidoRecord;
  fechaEs: string;
  numeroPedido: string | null;
  precioFinal: number | null;
  anticipo: number | null;
  saldoPendiente: number | null;
  /** Desglose guardado al enviar el pedido; null en pedidos anteriores. */
  desglose: DesgloseEstimado | null;
};

const usd = (value: number) =>
  value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function PedidoDocumentCliente({
  data,
  fechaEs,
  numeroPedido,
  precioFinal,
  anticipo,
  saldoPendiente,
  desglose,
}: Props) {
  const narrative = buildPedidoNarrativeEs(data);

  return (
    <Document title={`MOVARA — Pedido ${numeroPedido ?? data.clienteNombre}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>MOVARA ESPACIOS MODULARES</Text>
            <Text style={styles.subtitle}>CONFIRMACIÓN DE PEDIDO</Text>
          </View>
        </View>

        <View style={styles.clientBlock}>
          {numeroPedido && (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Pedido:</Text>
              <Text style={styles.clientValue}>{numeroPedido}</Text>
            </View>
          )}
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Cliente:</Text>
            <Text style={styles.clientValue}>{data.clienteNombre}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>WhatsApp:</Text>
            <Text style={styles.clientValue}>{data.clienteWhatsapp}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Fecha:</Text>
            <Text style={styles.clientValue}>{fechaEs}</Text>
          </View>
        </View>

        <Text style={styles.clientSectionTitle}>Tu configuración MOVARA</Text>

        {narrative.map((item, i) =>
          item.type === "line" ? (
            <View key={i} style={styles.narrativeLine}>
              <Text style={styles.narrativeLineLabel}>{item.label}: </Text>
              <Text style={styles.narrativeLineValue}>{item.value}</Text>
            </View>
          ) : (
            <View key={i} style={styles.narrativeGroup} wrap={false}>
              <Text style={styles.narrativeGroupTitle}>{item.title}</Text>
              {item.bullets.map((bullet, j) => (
                <View key={j} style={styles.narrativeBullet}>
                  <Text style={styles.narrativeBulletDot}>•</Text>
                  <Text style={styles.narrativeBulletText}>{bullet}</Text>
                </View>
              ))}
              {item.note ? <Text style={styles.narrativeNote}>{item.note}</Text> : null}
            </View>
          )
        )}

        {desglose && (
          <View wrap={false}>
            <View style={styles.sectionDivider} />
            <Text style={styles.clientSectionTitle}>Presupuesto estimado</Text>
            <View style={styles.desgloseRow}>
              <Text>Precio base</Text>
              <Text>USD {usd(desglose.base)}</Text>
            </View>
            {desglose.adicionales.map((a, i) => (
              <View key={`a${i}`} style={styles.desgloseRow}>
                <Text>+ {a.nombre}</Text>
                <Text>USD {usd(a.precio)}</Text>
              </View>
            ))}
            {desglose.aConsultar.map((nombre, i) => (
              <View key={`c${i}`} style={styles.desgloseRow}>
                <Text>+ {nombre}</Text>
                <Text>{A_CONSULTAR}</Text>
              </View>
            ))}
            <View style={styles.desgloseTotal}>
              <Text>Total estimado</Text>
              <Text>USD {usd(desglose.total)}</Text>
            </View>
            <Text style={styles.desgloseLeyenda}>
              {LEYENDA_PRECIOS}
              {desglose.aConsultar.length ? ` Lo que figura como "${A_CONSULTAR}" no está incluido en el total.` : ""}
            </Text>
          </View>
        )}

        {precioFinal != null && (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.clientSectionTitle}>Precio</Text>
            <View style={styles.narrativeLine}>
              <Text style={styles.narrativeLineLabel}>Precio final: </Text>
              <Text style={styles.narrativeLineValue}>USD {usd(precioFinal)}</Text>
            </View>
            {anticipo != null && (
              <View style={styles.narrativeLine}>
                <Text style={styles.narrativeLineLabel}>Anticipo recibido: </Text>
                <Text style={styles.narrativeLineValue}>USD {usd(anticipo)}</Text>
              </View>
            )}
            {saldoPendiente != null && (
              <View style={styles.narrativeLine}>
                <Text style={styles.narrativeLineLabel}>Saldo pendiente: </Text>
                <Text style={styles.narrativeLineValue}>USD {usd(saldoPendiente)}</Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.clientFootnote}>
          Este documento resume tu pedido MOVARA. Ante cualquier consulta, contactanos por
          WhatsApp.
        </Text>

        <Text style={styles.footer}>MOVARA Espacios Modulares — Confirmación de pedido.</Text>
      </Page>
    </Document>
  );
}
