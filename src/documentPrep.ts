import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PreparedDocument } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export function isSupportedFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type) || file.type === "application/pdf";
}

export async function prepareDocument(file: File): Promise<PreparedDocument> {
  if (!isSupportedFile(file)) {
    throw new Error("Unsupported file type. Use PNG, JPG, JPEG, WEBP, or PDF.");
  }

  if (file.type === "application/pdf") {
    return preparePdf(file);
  }

  const imageDataUrl = await readAsDataUrl(file);
  return {
    originalFileName: file.name,
    mimeType: file.type,
    imageDataUrl,
    previewUrl: imageDataUrl,
    warnings: [],
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function preparePdf(file: File): Promise<PreparedDocument> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2, Math.max(1.15, 1800 / baseViewport.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare a canvas for the PDF preview.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const warnings =
    pdf.numPages > 1 ? ["Only page 1 was processed for this v1 build."] : [];

  return {
    originalFileName: file.name,
    mimeType: "image/jpeg",
    imageDataUrl,
    previewUrl: imageDataUrl,
    warnings,
  };
}
