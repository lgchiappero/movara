import path from "path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { GOLD, DARK } from "@/lib/pdf/pedido-pdf-styles";
import { CONCEPTO_LABELS, ESTADO_ACUERDO_LABELS, type EstadoAcuerdo } from "@/lib/cobranza/constantes";

const logoPath = path.join(process.cwd(), "public", "Logo.jpeg");

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: DARK, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 16,
    marginBottom: 20,
  },
  logo: { width: 48, height: 48, marginRight: 14 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  subtitle: { fontSize: 9, color: GOLD, fontFamily: "Helvetica-Bold" },
  clientBlock: {
    backgroundColor: "#F9F5EE",
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: 10,
    marginBottom: 20,
  },
  clientName: { fontFamily: "Helvetica-Bold", fontSize: 12, color: DARK },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    backgroundColor: "#F4F4F4",
    padding: 4,
    marginBottom: 4,
    marginTop: 12,
  },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#DDD", paddingBottom: 3, marginBottom: 3 },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#888" },
  td: { fontSize: 9, color: DARK },
  colUnidad: { width: 90 },
  colConcepto: { width: 100 },
  colTotal: { width: 90, textAlign: "right" },
  colPendiente: { width: 90, textAlign: "right" },
  colEstado: { width: 80 },
  colFecha: { width: 80 },
  colImporte: { width: 100, textAlign: "right" },
  colModalidad: { width: 100 },
  saldoBox: { marginTop: 6, padding: 8, backgroundColor: "#F4F4F4" },
  saldoLabel: { fontSize: 8, color: "#888" },
  saldoValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK },
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

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatFecha(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export type AcuerdoParaPdf = {
  id: string;
  unidadNumero: string | null;
  concepto: string;
  moneda: string;
  totalAcordado: number;
  pendiente: number;
  estado: EstadoAcuerdo;
};

export type MovimientoParaPdf = {
  id: string;
  fecha: string;
  unidadNumero: string | null;
  importe: number;
  moneda: string;
  modalidad: string;
};

export function EstadoCuentaDocument({
  clienteNombre,
  fechaEmision,
  acuerdos,
  movimientos,
  saldosPorMoneda,
}: {
  clienteNombre: string;
  fechaEmision: string;
  acuerdos: AcuerdoParaPdf[];
  movimientos: MovimientoParaPdf[];
  saldosPorMoneda: [string, number][];
}) {
  return (
    <Document title={`MOVARA — Estado de cuenta ${clienteNombre}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View>
            <Text style={styles.title}>MOVARA ESPACIOS MODULARES</Text>
            <Text style={styles.subtitle}>ESTADO DE CUENTA</Text>
          </View>
        </View>

        <View style={styles.clientBlock}>
          <Text style={styles.clientName}>{clienteNombre}</Text>
          <Text style={{ fontSize: 8, color: "#888", marginTop: 2 }}>Emitido el {fechaEmision}</Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {saldosPorMoneda.map(([moneda, saldo]) => (
            <View key={moneda} style={styles.saldoBox}>
              <Text style={styles.saldoLabel}>Saldo pendiente ({moneda})</Text>
              <Text style={styles.saldoValue}>{formatMoneda(saldo, moneda)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Acuerdos de cobro</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, styles.colUnidad]}>Unidad</Text>
          <Text style={[styles.th, styles.colConcepto]}>Concepto</Text>
          <Text style={[styles.th, styles.colTotal]}>Total acordado</Text>
          <Text style={[styles.th, styles.colPendiente]}>Pendiente</Text>
          <Text style={[styles.th, styles.colEstado]}>Estado</Text>
        </View>
        {acuerdos.map((a) => (
          <View key={a.id} style={styles.tableRow}>
            <Text style={[styles.td, styles.colUnidad]}>{a.unidadNumero ?? "Sin número"}</Text>
            <Text style={[styles.td, styles.colConcepto]}>
              {CONCEPTO_LABELS[a.concepto as keyof typeof CONCEPTO_LABELS] ?? a.concepto}
            </Text>
            <Text style={[styles.td, styles.colTotal]}>{formatMoneda(a.totalAcordado, a.moneda)}</Text>
            <Text style={[styles.td, styles.colPendiente]}>{formatMoneda(a.pendiente, a.moneda)}</Text>
            <Text style={[styles.td, styles.colEstado]}>{ESTADO_ACUERDO_LABELS[a.estado]}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Historial de movimientos</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
          <Text style={[styles.th, styles.colUnidad]}>Unidad</Text>
          <Text style={[styles.th, styles.colImporte]}>Importe</Text>
          <Text style={[styles.th, styles.colModalidad]}>Modalidad</Text>
        </View>
        {movimientos.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#888", marginTop: 4 }}>Todavía no hay movimientos registrados.</Text>
        ) : (
          movimientos.map((m) => (
            <View key={m.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.colFecha]}>{formatFecha(m.fecha)}</Text>
              <Text style={[styles.td, styles.colUnidad]}>{m.unidadNumero ?? "Sin número"}</Text>
              <Text style={[styles.td, styles.colImporte]}>{formatMoneda(m.importe, m.moneda)}</Text>
              <Text style={[styles.td, styles.colModalidad]}>{m.modalidad}</Text>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <Text>MOVARA Espacios Modulares — Documento generado automáticamente, sin validez fiscal.</Text>
        </View>
      </Page>
    </Document>
  );
}
