import {
  AlertTriangle,
  FileText,
  HelpCircle,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { BulkReviewTable } from "./components/BulkReviewTable";
import { prepareDocument } from "./documentPrep";
import {
  downloadApprovedWorkbookRows,
  type ExportResult,
} from "./excelExport";
import { extractDocument } from "./localApiClient";
import type { BatchItem, ExtractedFields, Stage } from "./types";

type Issue = {
  id: string;
  tone: "error" | "warning";
  title: string;
  problem: string;
  fix: string;
};

const emptyFields: ExtractedFields = {
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

const stageLabels: Array<{ id: Stage; label: string }> = [
  { id: "ready", label: "Ready" },
  { id: "preparing", label: "Preparing" },
  { id: "extracting", label: "Extracting" },
  { id: "review", label: "Review" },
  { id: "writing", label: "Exporting" },
  { id: "complete", label: "Complete" },
];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("ready");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [activePreviewUrl, setActivePreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const busy = stage === "preparing" || stage === "extracting" || stage === "writing";
  const issues = buildIssues(error, items);

  function updateItem(id: string, patch: Partial<BatchItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function processFiles(fileList: FileList | File[]) {
    if (busy) return;

    const files = Array.from(fileList);
    if (!files.length) return;

    setError("");
    setExportResult(null);

    const queuedItems = files.map(createBatchItem);
    setItems((current) => [...current, ...queuedItems]);

    for (const item of queuedItems) {
      updateItem(item.id, { status: "preparing", error: "" });
      setStage("preparing");

      try {
        if (!item.file) {
          throw new Error("No file attached to this queue item.");
        }

        const document = await prepareDocument(item.file);
        setActivePreviewUrl(document.previewUrl);
        updateItem(item.id, {
          previewUrl: document.previewUrl,
          warnings: document.warnings,
        });

        setStage("extracting");
        updateItem(item.id, { status: "extracting" });
        const result = await extractDocument(document);

        updateItem(item.id, {
          status: "ready",
          extracted: normalizeExtracted(result.extracted),
          warnings: [...document.warnings, ...(result.warnings ?? [])],
        });
      } catch (err) {
        updateItem(item.id, {
          status: "failed",
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    }

    setStage("review");
  }

  async function handleExport() {
    const rows = items
      .filter((item) => item.status === "ready")
      .map((item) => ({
        originalFileName: item.originalFileName,
        extracted: item.extracted,
      }));

    if (!rows.length) return;

    try {
      setError("");
      setStage("writing");
      const result = await downloadApprovedWorkbookRows(rows);
      setExportResult(result);
      setItems((current) =>
        current.map((item) =>
          item.status === "ready" ? { ...item, status: "exported" } : item,
        ),
      );
      setStage("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the Excel file.");
      setStage("review");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void processFiles(event.target.files ?? []);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFiles(event.dataTransfer.files ?? []);
  }

  function addManualEntry(fields: ExtractedFields) {
    if (busy) return;

    setError("");
    setExportResult(null);
    setItems((current) => [...current, createManualItem(current.length + 1, fields)]);
    setStage("review");
  }

  function updateField(id: string, key: keyof ExtractedFields, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              extracted: {
                ...item.extracted,
                [key]: key === "confidence" ? clampConfidence(value, true) : value,
              },
            }
          : item,
      ),
    );
  }

  function reset() {
    setStage("ready");
    setItems([]);
    setActivePreviewUrl("");
    setError("");
    setExportResult(null);
  }

  const activeFileName =
    items.find((item) => item.previewUrl === activePreviewUrl)?.originalFileName ??
    "Document preview";

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local document extraction</p>
          <h1>DocScalpel</h1>
        </div>
        <div className="topbar-actions">
          <IssueMenu issues={issues} />
          <ConfidenceFaqMenu />
          <a className="api-link" href="http://127.0.0.1:8787/api/health" target="_blank" rel="noreferrer">
            API
          </a>
        </div>
      </header>

      <section className={`status-strip stage-${stage}`} aria-label="Processing status">
        {stageLabels.map((item, index) => {
          const currentIndex = stageLabels.findIndex((entry) => entry.id === stage);
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "active" : "pending";

          return (
            <div className={`status-step ${state}`} key={item.id}>
              <span className="status-dot" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </section>

      <div className="workspace">
        <section className="panel upload-panel">
          <div
            className={`dropzone ${isDragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud size={36} aria-hidden="true" />
            <strong>{items.length ? `${items.length} document queue` : "Drop receipts or invoices"}</strong>
            <span>PNG, JPG, JPEG, WEBP, or PDF</span>
            <div className="upload-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                title="Choose files"
              >
                {busy ? (
                  <Loader2 className="spin" size={18} aria-hidden="true" />
                ) : (
                  <FileText size={18} aria-hidden="true" />
                )}
                Choose
              </button>
            </div>
            <input
              ref={fileInputRef}
              className="hidden-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              multiple
              onChange={handleFileChange}
            />
          </div>

          <div className="queue-list" aria-label="Document queue">
            {items.length ? (
              items.map((item) => (
                <button
                  className={`queue-file ${item.previewUrl === activePreviewUrl ? "active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => setActivePreviewUrl(item.previewUrl)}
                  disabled={!item.previewUrl}
                  title={item.originalFileName}
                >
                  <span>{item.originalFileName}</span>
                  <small>{item.status}</small>
                </button>
              ))
            ) : (
              <div className="queue-empty">No queued documents.</div>
            )}
          </div>

          <div className="preview-box">
            {activePreviewUrl ? (
              <img src={activePreviewUrl} alt={activeFileName} />
            ) : (
              <div className="preview-empty">
                <FileText size={34} aria-hidden="true" />
                <span>No preview selected</span>
              </div>
            )}
          </div>
        </section>

        <BulkReviewTable
          items={items}
          busy={busy}
          exportResult={exportResult}
          onFieldChange={updateField}
          onManualAdd={addManualEntry}
          onReset={reset}
          onExport={handleExport}
        />
      </div>
    </main>
  );
}

function ConfidenceFaqMenu() {
  return (
    <details className="issue-menu faq-menu">
      <summary title="Open confidence FAQ">
        <HelpCircle size={18} aria-hidden="true" />
        <span>Confidence</span>
      </summary>
      <div className="issue-popover faq-popover" role="dialog" aria-label="Confidence FAQ">
        <div className="issue-popover-heading">
          <p className="eyebrow">FAQ</p>
          <h2>Confidence Scores</h2>
        </div>

        <div className="issue-list">
          <article className="issue-card faq-card">
            <h3>What is confidence?</h3>
            <p>
              Confidence is the model's estimate of how reliable the extracted row is,
              from 0 to 1. A value near 1 means the scan looked clear and the fields
              were easier to read.
            </p>
          </article>
          <article className="issue-card faq-card">
            <h3>Should I trust a high score?</h3>
            <p>
              Use it as a review signal, not a guarantee. Always double-check totals,
              dates, and document numbers before exporting.
            </p>
          </article>
          <article className="issue-card faq-card">
            <h3>What does a low score mean?</h3>
            <p>
              Low confidence usually means the image is blurry, cropped, handwritten,
              unusually formatted, or the model had to guess from limited text.
            </p>
          </article>
          <article className="issue-card faq-card">
            <h3>Why is it blank for manual rows?</h3>
            <p>
              Manual rows are typed by you, so the AI did not evaluate the document.
              Leaving confidence blank keeps those rows separate from scanned rows.
            </p>
          </article>
        </div>
      </div>
    </details>
  );
}

function IssueMenu({ issues }: { issues: Issue[] }) {
  const errorCount = issues.filter((issue) => issue.tone === "error").length;

  return (
    <details className={`issue-menu ${issues.length ? "has-issues" : ""}`}>
      <summary title="Open issue details">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>Issues</span>
        {issues.length ? <strong>{issues.length}</strong> : null}
      </summary>
      <div className="issue-popover" role="status">
        <div className="issue-popover-heading">
          <p className="eyebrow">Issue details</p>
          <h2>{issues.length ? "What Needs Attention" : "No Current Issues"}</h2>
        </div>

        {issues.length ? (
          <div className="issue-list">
            {issues.map((issue) => (
              <article className={`issue-card ${issue.tone}`} key={issue.id}>
                <div className="issue-card-heading">
                  {issue.tone === "error" ? (
                    <XCircle size={18} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={18} aria-hidden="true" />
                  )}
                  <h3>{issue.title}</h3>
                </div>
                <dl>
                  <div>
                    <dt>Problem</dt>
                    <dd>{issue.problem}</dd>
                  </div>
                  <div>
                    <dt>How to fix</dt>
                    <dd>{issue.fix}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="issue-empty">The current queue has no errors or warnings.</p>
        )}

        {errorCount ? (
          <p className="issue-footer">{errorCount} error{errorCount === 1 ? "" : "s"} found.</p>
        ) : null}
      </div>
    </details>
  );
}

function createBatchItem(file: File): BatchItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    source: "upload",
    originalFileName: file.name,
    status: "queued",
    extracted: emptyFields,
    warnings: [],
    error: "",
    previewUrl: "",
  };
}

function createManualItem(index: number, fields: ExtractedFields): BatchItem {
  return {
    id: `manual-${Date.now()}-${crypto.randomUUID()}`,
    source: "manual",
    originalFileName: `Manual entry ${index}`,
    status: "ready",
    extracted: normalizeExtracted(fields, true),
    warnings: [],
    error: "",
    previewUrl: "",
  };
}

function normalizeExtracted(
  extracted: ExtractedFields,
  allowBlankConfidence = false,
): ExtractedFields {
  return {
    ...emptyFields,
    ...extracted,
    confidence: clampConfidence(String(extracted.confidence ?? 0), allowBlankConfidence),
  };
}

function clampConfidence(value: string, allowBlank = false): number | "" {
  if (allowBlank && value.trim() === "") return "";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

function buildIssues(error: string, items: BatchItem[]): Issue[] {
  const issues: Issue[] = [];

  if (error) {
    issues.push({
      id: "app-error",
      tone: "error",
      title: "App action failed",
      problem: error,
      fix: fixForMessage(error),
    });
  }

  for (const item of items) {
    if (item.status === "failed" && item.error) {
      issues.push({
        id: `failed-${item.id}`,
        tone: "error",
        title: `${item.originalFileName} failed`,
        problem: item.error,
        fix: fixForMessage(item.error),
      });
    }

    item.warnings.forEach((warning, index) => {
      issues.push({
        id: `warning-${item.id}-${index}`,
        tone: "warning",
        title: `${item.originalFileName} warning`,
        problem: warning,
        fix: fixForMessage(warning),
      });
    });
  }

  return issues;
}

function fixForMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("local extraction service is not running")) {
    return "Start the local API with npm.cmd run dev, then try the document again.";
  }

  if (normalized.includes("openai_api_key") || normalized.includes("authentication")) {
    return "Check OPENAI_API_KEY in .env, save the file, and restart the local API.";
  }

  if (normalized.includes("rate limit")) {
    return "Wait a little while, then retry the failed document.";
  }

  if (normalized.includes("openai service error")) {
    return "Retry shortly. If it keeps happening, check OpenAI status or switch models in .env.";
  }

  if (normalized.includes("unsupported file type")) {
    return "Use PNG, JPG, JPEG, WEBP, or a PDF file.";
  }

  if (normalized.includes("too large")) {
    return "Use a smaller file or rescan the document at a lower resolution.";
  }

  if (normalized.includes("pdf") && normalized.includes("page")) {
    return "For this version, split multi-page PDFs and upload the page you want extracted.";
  }

  if (normalized.includes("excel") || normalized.includes("workbook")) {
    return "Close any open copy of the exported workbook, then try exporting again.";
  }

  if (normalized.includes("invalid extraction") || normalized.includes("invalid extraction json")) {
    return "Retry the document. If it repeats, the scan may be unclear or the model response needs adjustment.";
  }

  return "Review the document, fix any visible issue, then retry or add the row manually.";
}
