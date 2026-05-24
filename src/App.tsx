import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { ReviewPanel } from "./components/ReviewPanel";
import { prepareDocument } from "./documentPrep";
import { downloadApprovedWorkbook, type ExportResult } from "./excelExport";
import { extractDocument } from "./n8nClient";
import { defaultReviewSchema, reviewSchemas } from "./reviewSchemas";
import type { ExtractedFields, PreparedDocument, Stage } from "./types";

const emptyFields: ExtractedFields = {
  document_type: "receipt",
  vendor_name: "",
  document_number: "",
  document_date: "",
  currency: "",
  subtotal: "",
  tax: "",
  total: "",
  payment_method: "",
  confidence: 0,
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
  const [prepared, setPrepared] = useState<PreparedDocument | null>(null);
  const [extracted, setExtracted] = useState<ExtractedFields>(emptyFields);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [selectedSchemaId, setSelectedSchemaId] = useState(defaultReviewSchema.id);

  const busy = stage === "preparing" || stage === "extracting" || stage === "writing";
  const canApprove = stage === "review" && prepared && !busy;
  const selectedSchema =
    reviewSchemas.find((schema) => schema.id === selectedSchemaId) ?? defaultReviewSchema;

  async function processFile(file: File) {
    setError("");
    setWarnings([]);
    setExportResult(null);
    setPrepared(null);
    setExtracted(emptyFields);

    try {
      setStage("preparing");
      const document = await prepareDocument(file);
      setPrepared(document);
      setWarnings(document.warnings);

      setStage("extracting");
      const result = await extractDocument(document);
      setExtracted(normalizeExtracted(result.extracted));
      setWarnings([...document.warnings, ...(result.warnings ?? [])]);
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("ready");
    }
  }

  async function handleApprove() {
    if (!prepared) return;

    try {
      setError("");
      setStage("writing");
      const result = downloadApprovedWorkbook(prepared.originalFileName, extracted);
      setExportResult(result);
      setStage("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the Excel file.");
      setStage("review");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (busy) return;
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function updateField(key: keyof ExtractedFields, value: string) {
    setExtracted((current) => ({
      ...current,
      [key]: key === "confidence" ? clampConfidence(value) : value,
    }));
  }

  function reset() {
    setStage("ready");
    setPrepared(null);
    setExtracted(emptyFields);
    setWarnings([]);
    setError("");
    setExportResult(null);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local intake</p>
          <h1>Document Extraction</h1>
        </div>
        <a className="n8n-link" href="http://localhost:5678" target="_blank" rel="noreferrer">
          <ExternalLink size={18} aria-hidden="true" />
          n8n
        </a>
      </header>

      <section className="status-strip" aria-label="Processing status">
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

      {error ? (
        <div className="notice error" role="alert">
          <XCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {warnings.length ? (
        <div className="notice warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{warnings.join(" ")}</span>
        </div>
      ) : null}

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
            <strong>{prepared?.originalFileName ?? "Drop a receipt or invoice"}</strong>
            <span>PNG, JPG, JPEG, WEBP, or PDF</span>
            <button
              className="primary-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              title="Choose file"
            >
              {busy ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
              Choose
            </button>
            <input
              ref={fileInputRef}
              className="hidden-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFileChange}
            />
          </div>

          <div className="preview-box">
            {prepared ? (
              <img src={prepared.previewUrl} alt="Selected document preview" />
            ) : (
              <div className="preview-empty">
                <FileText size={34} aria-hidden="true" />
                <span>No file selected</span>
              </div>
            )}
          </div>
        </section>

        <ReviewPanel
          schema={selectedSchema}
          schemas={reviewSchemas}
          selectedSchemaId={selectedSchemaId}
          fields={extracted}
          stage={stage}
          busy={busy}
          canExport={Boolean(canApprove)}
          exportResult={exportResult}
          onSchemaChange={setSelectedSchemaId}
          onFieldChange={updateField}
          onReset={reset}
          onExport={handleApprove}
        />
      </div>
    </main>
  );
}

function normalizeExtracted(extracted: ExtractedFields): ExtractedFields {
  return {
    ...emptyFields,
    ...extracted,
    confidence: clampConfidence(String(extracted.confidence ?? 0)),
  };
}

function clampConfidence(value: string): number {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}
