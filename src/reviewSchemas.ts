import type { ExtractedFields } from "./types";

export type ReviewField = {
  key: keyof ExtractedFields;
  label: string;
  type?: "text" | "date" | "number" | "textarea";
};

export type ReviewSection = {
  id: string;
  title: string;
  fields: ReviewField[];
};

export type ReviewSchema = {
  id: string;
  label: string;
  sections: ReviewSection[];
};

export const reviewSchemas: ReviewSchema[] = [
  {
    id: "receipt-summary",
    label: "Receipt Summary",
    sections: [
      {
        id: "identity",
        title: "Document",
        fields: [
          { key: "vendor_name", label: "Vendor Name" },
          { key: "document_number", label: "Document Number" },
          { key: "document_date", label: "Document Date", type: "date" },
        ],
      },
      {
        id: "amounts",
        title: "Amounts",
        fields: [
          { key: "currency", label: "Currency" },
          { key: "subtotal", label: "Subtotal" },
          { key: "tax", label: "Tax" },
          { key: "total", label: "Total" },
        ],
      },
      {
        id: "review",
        title: "Review Metadata",
        fields: [
          { key: "payment_method", label: "Payment Method" },
          { key: "confidence", label: "Confidence", type: "number" },
          { key: "notes", label: "Comments", type: "textarea" },
        ],
      },
    ],
  },
  {
    id: "invoice-summary",
    label: "Invoice Summary",
    sections: [
      {
        id: "identity",
        title: "Document",
        fields: [
          { key: "vendor_name", label: "Vendor Name" },
          { key: "document_number", label: "Invoice Number" },
          { key: "document_date", label: "Invoice Date", type: "date" },
        ],
      },
      {
        id: "amounts",
        title: "Amounts",
        fields: [
          { key: "currency", label: "Currency" },
          { key: "subtotal", label: "Subtotal" },
          { key: "tax", label: "Tax" },
          { key: "total", label: "Amount Due" },
        ],
      },
      {
        id: "review",
        title: "Review Metadata",
        fields: [
          { key: "payment_method", label: "Payment Method" },
          { key: "confidence", label: "Confidence", type: "number" },
          { key: "notes", label: "Comments", type: "textarea" },
        ],
      },
    ],
  },
];

export const defaultReviewSchema = reviewSchemas[0];
