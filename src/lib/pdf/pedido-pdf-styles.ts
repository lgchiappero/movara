import { StyleSheet } from "@react-pdf/renderer";

export const GOLD = "#D4B06A";
export const DARK = "#2F2F2F";

export const pedidoPdfStyles = StyleSheet.create({
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
  note: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: "#888888",
    paddingHorizontal: 4,
    paddingTop: 4,
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
