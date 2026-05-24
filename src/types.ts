export type Stage =
  | "ready"
  | "preparing"
  | "extracting"
  | "review"
  | "writing"
  | "complete";

export type BatchStatus =
  | "queued"
  | "preparing"
  | "extracting"
  | "ready"
  | "failed"
  | "exported";

export type ExtractedFields = {
  vendor_name: string;
  document_number: string;
  document_date: string;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  payment_method: string;
  confidence: number | "";
  notes: string;
};

export type PreparedDocument = {
  originalFileName: string;
  mimeType: string;
  imageDataUrl: string;
  previewUrl: string;
  warnings: string[];
};

export type ExtractResponse = {
  status: "extracted";
  original_file_name: string;
  extracted: ExtractedFields;
  warnings?: string[];
};

export type BatchItem = {
  id: string;
  file?: File;
  source: "upload" | "manual";
  originalFileName: string;
  status: BatchStatus;
  extracted: ExtractedFields;
  warnings: string[];
  error: string;
  previewUrl: string;
};
