import path from "path";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import type { PedidoInput } from "@/lib/validators/pedido";
import { buildPedidoSpecSectionsEs } from "@/lib/pdf/pedido-spec-es";
import { pedidoPdfStyles as styles } from "@/lib/pdf/pedido-pdf-styles";

const logoPath = path.join(process.cwd(), "public", "Logo.jpeg");

type Props = {
  data: PedidoInput;
  fecha: string;
};

export function PedidoDocumentEs({ data, fecha }: Props) {
  const sections = buildPedidoSpecSectionsEs(data);

  return (
    <Document title={`MOVARA — Comprobante de pedido ${data.clienteNombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>MOVARA ESPACIOS MODULARES</Text>
            <Text style={styles.subtitle}>COMPROBANTE DE CONFIGURACIÓN DE PEDIDO</Text>
          </View>
          <Text>{fecha}</Text>
        </View>

        <View style={styles.clientBlock}>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Cliente:</Text>
            <Text style={styles.clientValue}>{data.clienteNombre}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Contacto:</Text>
            <Text style={styles.clientValue}>{data.clienteWhatsapp}</Text>
          </View>
          {data.clienteEmail ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Email:</Text>
              <Text style={styles.clientValue}>{data.clienteEmail}</Text>
            </View>
          ) : null}
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
            {section.note ? <Text style={styles.note}>{section.note}</Text> : null}
          </View>
        ))}

        <Text style={styles.footer}>
          MOVARA Espacios Modulares — Este documento es un comprobante de la configuración
          enviada a través del formulario de pedido online.
        </Text>
      </Page>
    </Document>
  );
}
