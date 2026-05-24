import type {
  ExtractResponse,
  PreparedDocument,
} from "./types";

const N8N_BASE_URL = "http://localhost:5678/webhook";

export async function extractDocument(
  document: PreparedDocument,
): Promise<ExtractResponse> {
  const response = await postJson(`${N8N_BASE_URL}/document-extract`, {
    original_file_name: document.originalFileName,
    mime_type: document.mimeType,
    image_data_url: document.imageDataUrl,
    processed_at: new Date().toISOString(),
  });

  if (response.status !== "extracted" || !response.extracted) {
    throw new Error("n8n returned an invalid extraction response.");
  }

  return response as ExtractResponse;
}

async function postJson(url: string, body: unknown): Promise<any> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach n8n at http://localhost:5678.");
  }

  const text = await response.text();
  const data = text ? parseJson(text) : {};

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText;
    throw new Error(`n8n request failed: ${message}`);
  }

  return data;
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("n8n returned a non-JSON response.");
  }
}
