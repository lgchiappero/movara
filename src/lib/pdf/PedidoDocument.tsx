import path from "path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { PedidoInput } from "@/lib/validators/pedido";
import { buildPedidoSpecSections } from "@/lib/pdf/pedido-spec";

const GOLD = "#D4B06A";
const DARK = "#2F2F2F";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: DARK,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 16,
    marginBottom: 20,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 9,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
  },
  clientBlock: {
    backgroundColor: "#F9F5EE",
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: 10,
    marginBottom: 20,
  },
  clientRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  clientLabel: {
    width: 70,
    color: "#888888",
  },
  clientValue: {
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    backgroundColor: "#F4F4F4",
    padding: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  rowLabel: {
    width: 200,
    color: "#555555",
  },
  rowValue: {
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#AAAAAA",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    paddingTop: 8,
  },
});

const logoPath = path.join(process.cwd(), "public", "Logo.jpeg");

type Props = {
  data: PedidoInput;
  fecha: string;
};

export function PedidoDocument({ data, fecha }: Props) {
  const sections = buildPedidoSpecSections(data);

  return (
    <Document title={`MOVARA — Pedido ${data.clienteNombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>MOVARA ESPACIOS MODULARES</Text>
            <Text style={styles.subtitle}>PURCHASE ORDER SPEC</Text>
          </View>
          <Text>{fecha}</Text>
        </View>

        <View style={styles.clientBlock}>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Client:</Text>
            <Text style={styles.clientValue}>{data.clienteNombre}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Contact:</Text>
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
          </View>
        ))}

        <Text style={styles.footer}>
          MOVARA Espacios Modulares — This document is a technical purchase order spec generated
          from the client&apos;s online configurator submission.
        </Text>
      </Page>
    </Document>
  );
}
