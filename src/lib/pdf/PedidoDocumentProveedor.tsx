import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";
import { buildSupplierSpecItems } from "@/lib/pdf/pedido-spec";
import { pedidoPdfStyles as styles } from "@/lib/pdf/pedido-pdf-styles";

type Props = {
  data: PedidoRecord;
  fechaIso: string;
  numeroPedido: string | null;
  numeroFabrica: string | null;
};

export function PedidoDocumentProveedor({ data, fechaIso, numeroPedido, numeroFabrica }: Props) {
  const supplierItems = buildSupplierSpecItems(data);

  return (
    <Document title={`MOVARA — Purchase Order Spec ${numeroPedido ?? ""}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.supplierWrapper} wrap={false}>
          <Text style={styles.supplierHeading}>Supplier Reference — Purchase Order Spec</Text>
          <Text style={styles.supplierMetaLine}>MOVARA ESPACIOS MODULARES — PURCHASE ORDER SPEC</Text>
          <Text style={styles.supplierMetaLine}>Date: {fechaIso}</Text>
          {numeroPedido && <Text style={styles.supplierMetaLine}>Order ref: {numeroPedido}</Text>}
          {numeroFabrica && (
            <Text style={styles.supplierMetaLine}>Factory ref: {numeroFabrica}</Text>
          )}

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
          MOVARA Espacios Modulares — Technical specification for supplier reference only. No
          pricing information included.
        </Text>
      </Page>
    </Document>
  );
}
