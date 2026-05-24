import * as XLSX from "xlsx-js-style";
import type { ExtractedFields } from "./types";

export const workbookHeaders = [
  "Processed At",
  "Original File Name",
  "Vendor Name",
  "Document Number",
  "Document Date",
  "Currency",
  "Subtotal",
  "Tax",
  "Total",
  "Payment Method",
  "Confidence",
  "Comments",
];

const columnStyles = [
  { width: 22 },
  { width: 28 },
  { width: 24 },
  { width: 20 },
  { width: 16 },
  { width: 12 },
  { width: 14 },
  { width: 14 },
  { width: 14 },
  { width: 20 },
  { width: 14 },
  { width: 34 },
];

const headerFill = "DDEEE7";
const bodyFill = "F2FAF6";

export type ExportResult = {
  fileName: string;
  message: string;
};

export type ApprovedWorkbookRow = {
  originalFileName: string;
  extracted: ExtractedFields;
};

export function downloadApprovedWorkbook(
  originalFileName: string,
  extracted: ExtractedFields,
): ExportResult {
  return downloadApprovedWorkbookRows([{ originalFileName, extracted }]);
}

export function downloadApprovedWorkbookRows(
  rows: ApprovedWorkbookRow[],
): ExportResult {
  if (!rows.length) {
    throw new Error("There are no extracted rows to export.");
  }

  const processedAt = new Date().toISOString();
  const dataRows = rows.map(({ originalFileName, extracted }) => [
    processedAt,
    originalFileName,
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
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([workbookHeaders, ...dataRows]);
  worksheet["!cols"] = columnStyles.map((style) => ({ wch: style.width }));
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: dataRows.length, c: workbookHeaders.length - 1 },
  }) };
  applyWorksheetStyles(worksheet, dataRows.length);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Documents");

  const fileName = `document-extraction-${safeTimestamp(processedAt)}.xlsx`;
  XLSX.writeFile(workbook, fileName, { compression: true });

  return {
    fileName,
    message: `Downloaded ${fileName} with ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
  };
}

function safeTimestamp(value: string): string {
  return value.replace(/[:.]/g, "-");
}

function applyWorksheetStyles(worksheet: XLSX.WorkSheet, dataRowCount: number) {
  workbookHeaders.forEach((_, columnIndex) => {
    const headerCell = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
    worksheet[headerCell].s = {
      fill: solidFill(headerFill),
      font: { bold: true, color: { rgb: "111827" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder("C7DED4"),
    };

    for (let rowIndex = 1; rowIndex <= dataRowCount; rowIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (!worksheet[address]) continue;

      worksheet[address].s = {
        fill: solidFill(bodyFill),
        alignment: {
          horizontal: columnIndex >= 6 && columnIndex <= 10 ? "right" : "left",
          vertical: "top",
          wrapText: true,
        },
        border: thinBorder("D9E2EC"),
      };

      if (columnIndex >= 6 && columnIndex <= 8) {
        worksheet[address].z = "#,##0.00";
      }

      if (columnIndex === 10) {
        worksheet[address].z = "0.00";
      }
    }
  });

  worksheet["!rows"] = [
    { hpt: 20 },
    ...Array.from({ length: dataRowCount }, () => ({ hpt: 24 })),
  ];
}

function solidFill(rgb: string) {
  return {
    patternType: "solid",
    fgColor: { rgb },
  };
}

function thinBorder(rgb: string) {
  return {
    top: { style: "thin", color: { rgb } },
    bottom: { style: "thin", color: { rgb } },
    left: { style: "thin", color: { rgb } },
    right: { style: "thin", color: { rgb } },
  };
}
