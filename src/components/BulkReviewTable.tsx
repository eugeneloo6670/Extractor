import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ExportResult } from "../excelExport";
import type { BatchItem, ExtractedFields } from "../types";

type BulkReviewTableProps = {
  items: BatchItem[];
  busy: boolean;
  exportResult: ExportResult | null;
  onFieldChange: (id: string, key: keyof ExtractedFields, value: string) => void;
  onManualAdd: (fields: ExtractedFields) => void;
  onReset: () => void;
  onExport: () => void;
};

const columns: Array<{
  key: keyof ExtractedFields;
  label: string;
  type?: "number" | "date";
}> = [
  { key: "vendor_name", label: "Vendor" },
  { key: "document_number", label: "Document Number" },
  { key: "document_date", label: "Date", type: "date" },
  { key: "currency", label: "Currency" },
  { key: "subtotal", label: "Subtotal" },
  { key: "tax", label: "Tax" },
  { key: "total", label: "Total" },
  { key: "payment_method", label: "Payment Method" },
  { key: "confidence", label: "Confidence", type: "number" },
  { key: "notes", label: "Comments" },
];

const manualColumns = columns.filter((column) => column.key !== "confidence");

export function BulkReviewTable({
  items,
  busy,
  exportResult,
  onFieldChange,
  onManualAdd,
  onReset,
  onExport,
}: BulkReviewTableProps) {
  const [manualFields, setManualFields] = useState<ExtractedFields>(emptyManualFields);
  const readyCount = items.filter((item) => item.status === "ready").length;
  const exportedCount = items.filter((item) => item.status === "exported").length;
  const canExport = !busy && readyCount > 0;

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== "extractor:update-field") {
        return;
      }

      onFieldChange(event.data.id, event.data.key, String(event.data.value ?? ""));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onFieldChange]);

  function updateManualField(key: keyof ExtractedFields, value: string) {
    setManualFields((current) => ({
      ...current,
      [key]: key === "confidence" ? clampConfidence(value, true) : value,
    }));
  }

  function addManualRow() {
    onManualAdd(manualFields);
    setManualFields(emptyManualFields);
  }

  function openRowsWindow() {
    const popup = window.open("", "extractorRows", "width=1280,height=760");
    if (!popup) return;

    popup.document.open();
    popup.document.write(createRowsWindowHtml(items, busy));
    popup.document.close();
    popup.focus();
  }

  return (
    <section className="panel review-panel queue-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2>Extracted Rows</h2>
        </div>
        <div className="panel-heading-actions">
          <button
            className="icon-button"
            type="button"
            onClick={openRowsWindow}
            disabled={!items.length}
            title="Open rows in new window"
          >
            <ExternalLink size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onReset}
            disabled={busy}
            title="Clear queue"
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="queue-summary" aria-label="Queue summary">
        <span>{items.length} total</span>
        <span>{readyCount} ready</span>
        <span>{exportedCount} exported</span>
      </div>

      <div className="bulk-table-wrap">
        <table className="bulk-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>File</th>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => (
                <tr key={item.id} className={item.status === "failed" ? "failed-row" : ""}>
                  <td>
                    <span className={`status-badge ${item.status}`}>{statusLabel(item)}</span>
                  </td>
                  <td className="file-cell" title={item.originalFileName}>
                    {item.originalFileName}
                    {item.warnings.length ? (
                      <span className="row-note">{item.warnings.join(" ")}</span>
                    ) : null}
                    {item.error ? <span className="row-error">{item.error}</span> : null}
                  </td>
                  {columns.map((column) => (
                    <td key={column.key}>
                      <input
                        type={column.type ?? "text"}
                        value={String(item.extracted[column.key] ?? "")}
                        min={column.key === "confidence" ? 0 : undefined}
                        max={column.key === "confidence" ? 1 : undefined}
                        step={column.key === "confidence" ? 0.01 : undefined}
                        onChange={(event) =>
                          onFieldChange(item.id, column.key, event.target.value)
                        }
                        disabled={
                          busy ||
                          item.status === "failed" ||
                          (item.source === "manual" && column.key === "confidence")
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-table" colSpan={columns.length + 2}>
                  No documents queued.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button
          className="secondary-button"
          type="button"
          onClick={onReset}
          disabled={busy || !items.length}
          title="Clear queue"
        >
          <RefreshCw size={18} aria-hidden="true" />
          Clear
        </button>
        <button
          className="approve-button"
          type="button"
          onClick={onExport}
          disabled={!canExport}
          title="Download Excel"
        >
          {busy ? (
            <Loader2 className="spin" size={18} aria-hidden="true" />
          ) : (
            <Download size={18} aria-hidden="true" />
          )}
          Download Excel
        </button>
      </div>

      {exportResult ? (
        <div className="complete-box" role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>{exportResult.message}</span>
        </div>
      ) : (
        <div className="pending-box">
          <ClipboardCheck size={20} aria-hidden="true" />
          <span>{queueMessage(items, busy)}</span>
        </div>
      )}

      <section className="manual-entry" aria-label="Manual entry">
        <div className="manual-entry-heading">
          <div>
            <p className="eyebrow">Manual input</p>
            <h3>Add Row</h3>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={addManualRow}
            disabled={busy}
            title="Add manual row"
          >
            <Plus size={18} aria-hidden="true" />
            Add
          </button>
        </div>
        <div className="manual-grid">
          {manualColumns.map((column) => (
            <label className={column.key === "notes" ? "manual-field notes-field" : "manual-field"} key={column.key}>
              <span>{column.label}</span>
              <input
                type={column.type ?? "text"}
                value={String(manualFields[column.key] ?? "")}
                min={column.key === "confidence" ? 0 : undefined}
                max={column.key === "confidence" ? 1 : undefined}
                step={column.key === "confidence" ? 0.01 : undefined}
                onChange={(event) => updateManualField(column.key, event.target.value)}
                disabled={busy}
              />
            </label>
          ))}
        </div>
      </section>
    </section>
  );
}

const emptyManualFields: ExtractedFields = {
  vendor_name: "",
  document_number: "",
  document_date: "",
  currency: "",
  subtotal: "",
  tax: "",
  total: "",
  payment_method: "",
  confidence: "",
  notes: "",
};

function statusLabel(item: BatchItem): string {
  if (item.status === "preparing") return "Preparing";
  if (item.status === "extracting") return "Extracting";
  if (item.status === "ready") return "Ready";
  if (item.status === "failed") return "Failed";
  if (item.status === "exported") return "Exported";
  return "Queued";
}

function queueMessage(items: BatchItem[], busy: boolean): string {
  if (busy) return "Processing documents one at a time.";
  if (!items.length) return "Waiting for documents.";
  if (items.some((item) => item.status === "ready")) return "Ready to export.";
  if (items.every((item) => item.status === "failed")) return "No extractable rows yet.";
  return "Queue complete.";
}

function clampConfidence(value: string, allowBlank = false): number | "" {
  if (allowBlank && value.trim() === "") return "";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

function createRowsWindowHtml(items: BatchItem[], busy: boolean): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Extracted Rows</title>
  <style>
    :root {
      color: #111111;
      background: #f5efdf;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 18px; background: #f5efdf; }
    h1 { margin: 0 0 14px; font-size: 1.35rem; letter-spacing: 0; }
    .table-wrap { overflow: auto; border: 1px solid #cfc1a2; border-radius: 8px; background: #fffaf0; }
    table { width: 100%; min-width: 1320px; border-collapse: collapse; }
    th, td { padding: 9px 8px; border-bottom: 1px solid #ded2b9; font-size: 0.84rem; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; z-index: 1; background: #e4ead2; font-weight: 900; }
    input { width: 100%; min-width: 96px; min-height: 36px; border: 1px solid #cfc1a2; border-radius: 6px; padding: 7px 8px; color: #111111; background: #fffdf5; outline: none; }
    input:focus { border-color: #1f6f4a; box-shadow: 0 0 0 3px rgba(31, 111, 74, 0.14); }
    input:disabled { color: #68645a; background: #eadfc8; }
    .file { max-width: 210px; overflow-wrap: anywhere; font-weight: 800; }
    .badge { display: inline-grid; place-items: center; min-width: 86px; min-height: 28px; padding: 0 8px; border-radius: 999px; background: #eee3c9; font-size: 0.75rem; font-weight: 900; text-transform: capitalize; }
  </style>
</head>
<body>
  <h1>Extracted Rows</h1>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>File</th>
          ${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => createRowsWindowRow(item, busy)).join("")}
      </tbody>
    </table>
  </div>
  <script>
    document.addEventListener("input", function (event) {
      var target = event.target;
      if (!target || !target.dataset || !target.dataset.id) return;
      window.opener.postMessage({
        type: "extractor:update-field",
        id: target.dataset.id,
        key: target.dataset.key,
        value: target.value
      }, window.location.origin);
    });
  </script>
</body>
</html>`;
}

function createRowsWindowRow(item: BatchItem, busy: boolean): string {
  return `<tr>
    <td><span class="badge">${escapeHtml(item.status)}</span></td>
    <td class="file">${escapeHtml(item.originalFileName)}</td>
    ${columns.map((column) => {
      const disabled =
        busy ||
        item.status === "failed" ||
        (item.source === "manual" && column.key === "confidence");
      return `<td><input
        data-id="${escapeHtml(item.id)}"
        data-key="${escapeHtml(column.key)}"
        type="${column.type ?? "text"}"
        value="${escapeHtml(String(item.extracted[column.key] ?? ""))}"
        ${column.key === "confidence" ? 'min="0" max="1" step="0.01"' : ""}
        ${disabled ? "disabled" : ""}
      /></td>`;
    }).join("")}
  </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
