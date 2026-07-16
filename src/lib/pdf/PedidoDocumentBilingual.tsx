import path from "path";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import type { PedidoInput } from "@/lib/validators/pedido";
import { buildPedidoNarrativeEs } from "@/lib/pdf/pedido-narrative-es";
import { buildSupplierSpecItems } from "@/lib/pdf/pedido-spec";
import { pedidoPdfStyles as styles } from "@/lib/pdf/pedido-pdf-styles";

const logoPath = path.join(process.cwd(), "public", "Logo.jpeg");

type Props = {
  data: PedidoInput;
  fechaEs: string;
  fechaIso: string;
};

export function PedidoDocumentBilingual({ data, fechaEs, fechaIso }: Props) {
  const narrative = buildPedidoNarrativeEs(data);
  const supplierItems = buildSupplierSpecItems(data);

  return (
    <Document title={`MOVARA — Configuración ${data.clienteNombre}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>MOVARA ESPACIOS MODULARES</Text>
            <Text style={styles.subtitle}>CONFIRMACIÓN DE CONFIGURACIÓN</Text>
          </View>
        </View>

        <View style={styles.clientBlock}>
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

        {/* ─── Sección 1: para el cliente ─── */}
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

        <Text style={styles.clientFootnote}>
          Esta configuración es un resumen de lo que solicitaste. Los detalles finales del
          pedido se confirman con MOVARA antes de la producción.
        </Text>

        <View style={styles.sectionDivider} />

        {/* ─── Sección 2: referencia técnica para el proveedor ─── */}
        <View style={styles.supplierWrapper} wrap={false}>
          <Text style={styles.supplierHeading}>Supplier Reference — Purchase Order Spec</Text>
          <Text style={styles.supplierMetaLine}>
            MOVARA ESPACIOS MODULARES — PURCHASE ORDER SPEC
          </Text>
          <Text style={styles.supplierMetaLine}>Date: {fechaIso}</Text>
          <Text style={styles.supplierMetaLine}>Client ref: {data.clienteNombre}</Text>

          {supplierItems.map((item, i) =>
            item.type === "line" ? (
              <Text key={i} style={styles.supplierFlatLine}>
                {item.label}: {item.value}
              </Text>
            ) : (
              <View key={i}>
                <Text style={styles.supplierGroupTitle}>{item.title}</Text>
                {item.rows.map((row, j) => (
                  <Text key={j} style={styles.supplierRow}>
                    - {row.label}: {row.value}
                  </Text>
                ))}
                {item.note ? <Text style={styles.supplierNote}>Note: {item.note}</Text> : null}
              </View>
            )
          )}
        </View>

        <Text style={styles.footer}>
          MOVARA Espacios Modulares — Confirmación de configuración generada desde el
          formulario de pedido online.
        </Text>
      </Page>
    </Document>
  );
}
