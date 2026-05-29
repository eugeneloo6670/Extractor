import { defaultColumns, enabledColumns } from "./columnConfig";
import type { ColumnConfig, ExtractedFields } from "./types";

type XlsxModule = typeof import("xlsx-js-style");
type Worksheet = Record<string, any>;

const baseWorkbookHeaders = ["Processed At", "Original File Name"];
const baseColumnStyles = [{ width: 22 }, { width: 28 }];

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
  columns: ColumnConfig[] = defaultColumns,
): Promise<ExportResult> {
  return downloadApprovedWorkbookRows([{ originalFileName, extracted }], columns);
}

export async function downloadApprovedWorkbookRows(
  rows: ApprovedWorkbookRow[],
  columns: ColumnConfig[] = defaultColumns,
): Promise<ExportResult> {
  if (!rows.length) {
    throw new Error("There are no extracted rows to export.");
  }

  const XLSX = await import("xlsx-js-style");
  const exportColumns = enabledColumns(columns);
  const workbookHeaders = [
    ...baseWorkbookHeaders,
    ...exportColumns.map((column) => displayLabel(column)),
  ];
  const processedAt = new Date().toISOString();
  const dataRows = rows.map(({ originalFileName, extracted }) => [
    processedAt,
    originalFileName,
    ...exportColumns.map((column) => extracted[column.key]),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([workbookHeaders, ...dataRows]);
  worksheet["!cols"] = [
    ...baseColumnStyles,
    ...exportColumns.map((column) => ({ width: columnWidth(column) })),
  ].map((style) => ({ wch: style.width }));
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: dataRows.length, c: workbookHeaders.length - 1 },
    }),
  };
  applyWorksheetStyles(XLSX, worksheet, dataRows.length, workbookHeaders, exportColumns);

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

function applyWorksheetStyles(
  XLSX: XlsxModule,
  worksheet: Worksheet,
  dataRowCount: number,
  workbookHeaders: string[],
  exportColumns: ColumnConfig[],
) {
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

      const exportColumn = exportColumns[columnIndex - baseWorkbookHeaders.length];
      worksheet[address].s = {
        fill: solidFill(bodyFill),
        alignment: {
          horizontal: isNumericColumn(exportColumn) ? "right" : "left",
          vertical: "top",
          wrapText: true,
        },
        border: thinBorder("D9E2EC"),
      };

      if (["subtotal", "tax", "total"].includes(String(exportColumn?.key))) {
        worksheet[address].z = "#,##0.00";
      }

      if (exportColumn?.key === "confidence") {
        worksheet[address].z = "0.00";
      }
    }
  });

  worksheet["!rows"] = [
    { hpt: 20 },
    ...Array.from({ length: dataRowCount }, () => ({ hpt: 24 })),
  ];
}

function displayLabel(column: ColumnConfig): string {
  return column.label.trim() || fallbackColumnLabel(column.key);
}

function columnWidth(column: ColumnConfig): number {
  if (column.key === "notes") return 34;
  return Math.max(12, displayLabel(column).length + 4);
}

function isNumericColumn(column: ColumnConfig | undefined): boolean {
  return ["subtotal", "tax", "total", "confidence"].includes(String(column?.key));
}

function fallbackColumnLabel(key: keyof ExtractedFields): string {
  return String(key)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
