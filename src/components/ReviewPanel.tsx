import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { ExportResult } from "../excelExport";
import type { ReviewSchema } from "../reviewSchemas";
import type { ExtractedFields, Stage } from "../types";

type ReviewPanelProps = {
  schema: ReviewSchema;
  schemas: ReviewSchema[];
  selectedSchemaId: string;
  fields: ExtractedFields;
  stage: Stage;
  busy: boolean;
  canExport: boolean;
  exportResult: ExportResult | null;
  onSchemaChange: (schemaId: string) => void;
  onFieldChange: (key: keyof ExtractedFields, value: string) => void;
  onReset: () => void;
  onExport: () => void;
};

export function ReviewPanel({
  schema,
  schemas,
  selectedSchemaId,
  fields,
  stage,
  busy,
  canExport,
  exportResult,
  onSchemaChange,
  onFieldChange,
  onReset,
  onExport,
}: ReviewPanelProps) {
  const disabled = stage === "ready" || busy || stage === "complete";

  return (
    <section className="panel review-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Review</p>
          <h2>Extracted Data</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onReset}
          disabled={busy}
          title="Reset"
        >
          <RefreshCw size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="review-module-bar" aria-label="Review schema">
        {schemas.map((option) => (
          <button
            className={option.id === selectedSchemaId ? "schema-chip active" : "schema-chip"}
            key={option.id}
            type="button"
            onClick={() => onSchemaChange(option.id)}
            disabled={busy}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="review-sections">
        {schema.sections.map((section) => (
          <section className="review-section" key={section.id}>
            <div className="section-heading">
              <h3>{section.title}</h3>
            </div>
            <div className="field-grid">
              {section.fields.map((field) => (
                <label
                  className={field.type === "textarea" ? "field notes-field" : "field"}
                  key={field.key}
                >
                  <span>{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      value={String(fields[field.key] ?? "")}
                      onChange={(event) => onFieldChange(field.key, event.target.value)}
                      disabled={disabled}
                    />
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      value={String(fields[field.key] ?? "")}
                      min={field.key === "confidence" ? 0 : undefined}
                      max={field.key === "confidence" ? 1 : undefined}
                      step={field.key === "confidence" ? 0.01 : undefined}
                      onChange={(event) => onFieldChange(field.key, event.target.value)}
                      disabled={disabled}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="actions">
        <button
          className="secondary-button"
          type="button"
          onClick={onReset}
          disabled={busy}
          title="Clear"
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
          {stage === "writing" ? (
            <Loader2 className="spin" size={18} aria-hidden="true" />
          ) : (
            <Download size={18} aria-hidden="true" />
          )}
          Download Excel
        </button>
      </div>

      {stage === "complete" ? (
        <div className="complete-box" role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>{exportResult?.message ?? "Excel file downloaded."}</span>
        </div>
      ) : (
        <div className="pending-box">
          <ClipboardCheck size={20} aria-hidden="true" />
          <span>{stageMessage(stage)}</span>
        </div>
      )}
    </section>
  );
}

function stageMessage(stage: Stage): string {
  switch (stage) {
    case "preparing":
      return "Preparing document.";
    case "extracting":
      return "Waiting for local extraction.";
    case "review":
      return "Ready to export.";
    case "writing":
      return "Creating Excel file.";
    default:
      return "Waiting for document.";
  }
}
