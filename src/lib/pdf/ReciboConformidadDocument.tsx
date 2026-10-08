import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { TextoRecibo } from "@/lib/recibos/texto";

const NEGRO = "#1A1A1A";
const DORADO = "#D4B36A";
const GRIS = "#6B6B6B";

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: NEGRO, fontFamily: "Helvetica", lineHeight: 1.45 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: DORADO, paddingBottom: 14, marginBottom: 22 },
  marca: { fontFamily: "Times-Roman", fontSize: 18, letterSpacing: 4, color: DORADO },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 14, textAlign: "center", letterSpacing: 1 },
  numero: { fontSize: 10, textAlign: "center", color: DORADO, fontFamily: "Helvetica-Bold", marginTop: 3, marginBottom: 18 },
  encabezado: { marginBottom: 12 },
  clausula: { marginBottom: 9, textAlign: "justify" },
  clausulaTitulo: { fontFamily: "Helvetica-Bold" },
  evidencia: { marginTop: 18, backgroundColor: "#F7F5F0", borderLeftWidth: 3, borderLeftColor: DORADO, padding: 12 },
  evidenciaTitulo: { fontFamily: "Helvetica-Bold", fontSize: 9, color: DORADO, marginBottom: 6, letterSpacing: 1 },
  fila: { flexDirection: "row", marginBottom: 3 },
  label: { width: 120, color: GRIS, fontSize: 9 },
  valor: { flex: 1, fontSize: 9 },
  hash: { flex: 1, fontSize: 8, fontFamily: "Courier" },
  pie: { position: "absolute", bottom: 26, left: 44, right: 44, fontSize: 8, color: GRIS, textAlign: "center" },
});

export type EvidenciaPdf = {
  confirmadoTexto: string; // fecha y hora en Argentina
  clienteEmail: string;
  ipConfirmacion: string | null;
  userAgent: string | null;
  hashContenido: string;
};

/** PDF del Recibo en Conformidad confirmado. El texto llega ya armado (el
 * mismo que confirmó el cliente) para que el PDF no pueda diferir de él. */
export function ReciboConformidadDocument({ texto, evidencia }: { texto: TextoRecibo; evidencia: EvidenciaPdf }) {
  return (
    <Document title={`Recibo en Conformidad ${texto.numero.replace("Nº ", "")}`} author="MOVARA">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.marca}>MOVARA</Text>
        </View>

        <Text style={styles.titulo}>{texto.titulo}</Text>
        <Text style={styles.numero}>{texto.numero}</Text>

        <Text style={styles.encabezado}>{texto.encabezado}</Text>
        {texto.clausulas.map((c) => (
          <Text key={c.titulo} style={styles.clausula}>
            <Text style={styles.clausulaTitulo}>{c.titulo}: </Text>
            {c.texto}
          </Text>
        ))}

        <View style={styles.evidencia} wrap={false}>
          <Text style={styles.evidenciaTitulo}>CONFIRMACIÓN ELECTRÓNICA (LEY 25.506, ART. 5)</Text>
          <View style={styles.fila}>
            <Text style={styles.label}>Confirmado el</Text>
            <Text style={styles.valor}>{evidencia.confirmadoTexto} (hora de Argentina)</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.label}>Email del Cliente</Text>
            <Text style={styles.valor}>{evidencia.clienteEmail}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.label}>Dirección IP</Text>
            <Text style={styles.valor}>{evidencia.ipConfirmacion ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.label}>Dispositivo</Text>
            <Text style={styles.valor}>{evidencia.userAgent ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.label}>Código de integridad (SHA-256)</Text>
            <Text style={styles.hash}>{evidencia.hashContenido}</Text>
          </View>
        </View>

        <Text style={styles.pie} fixed>
          MOVARA · {texto.numero} · contacto@movara.com.ar
        </Text>
      </Page>
    </Document>
  );
}
