export type Stage =
  | "ready"
  | "preparing"
  | "extracting"
  | "review"
  | "writing"
  | "complete";

export type ExtractedFields = {
  document_type: string;
  vendor_name: string;
  document_number: string;
  document_date: string;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  payment_method: string;
  confidence: number;
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
