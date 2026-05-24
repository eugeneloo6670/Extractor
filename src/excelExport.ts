import * as XLSX from "xlsx";
import type { ExtractedFields } from "./types";

export const workbookHeaders = [
  "Processed At",
  "Original File Name",
  "Document Type",
  "Vendor Name",
  "Document Number",
  "Document Date",
  "Currency",
  "Subtotal",
  "Tax",
  "Total",
  "Payment Method",
  "Confidence",
  "Notes",
];

export type ExportResult = {
  fileName: string;
  message: string;
};

export function downloadApprovedWorkbook(
  originalFileName: string,
  extracted: ExtractedFields,
): ExportResult {
  const processedAt = new Date().toISOString();
  const row = [
    processedAt,
    originalFileName,
    extracted.document_type,
    extracted.vendor_name,
    extracted.document_number,
    extracted.document_date,
    extracted.currency,
    extracted.subtotal,
    extracted.tax,
    extracted.total,
    extracted.payment_method,
    extracted.confidence,
    extracted.notes,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([workbookHeaders, row]);
  worksheet["!cols"] = workbookHeaders.map((header) => ({
    wch: Math.max(14, header.length + 2),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Documents");

  const fileName = `document-extraction-${safeTimestamp(processedAt)}.xlsx`;
  XLSX.writeFile(workbook, fileName, { compression: true });

  return {
    fileName,
    message: `Downloaded ${fileName}.`,
  };
}

function safeTimestamp(value: string): string {
  return value.replace(/[:.]/g, "-");
}
