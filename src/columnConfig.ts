import type { ColumnConfig } from "./types";

export const defaultColumns: ColumnConfig[] = [
  { key: "vendor_name", label: "Vendor", enabled: true },
  { key: "document_number", label: "Document Number", enabled: true },
  { key: "document_date", label: "Date", enabled: true, type: "date" },
  { key: "currency", label: "Currency", enabled: true },
  { key: "subtotal", label: "Subtotal", enabled: true },
  { key: "tax", label: "Tax", enabled: true },
  { key: "total", label: "Total", enabled: true },
  { key: "payment_method", label: "Payment Method", enabled: true },
  { key: "confidence", label: "Confidence", enabled: true, type: "number" },
  { key: "notes", label: "Comments", enabled: true },
];

export function enabledColumns(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.filter((column) => column.enabled);
}
