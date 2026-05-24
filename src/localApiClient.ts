import type {
  ExtractResponse,
  PreparedDocument,
} from "./types";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8787/api";

export type LocalApiHealth = {
  status: "ok";
  service: string;
  openaiConfigured: boolean;
  model: string;
};

export async function getLocalApiHealth(): Promise<LocalApiHealth> {
  return postOrGetJson(`${LOCAL_API_BASE_URL}/health`);
}

export async function extractDocument(
  document: PreparedDocument,
): Promise<ExtractResponse> {
  const response = await postOrGetJson(`${LOCAL_API_BASE_URL}/document-extract`, {
    original_file_name: document.originalFileName,
    mime_type: document.mimeType,
    image_data_url: document.imageDataUrl,
    processed_at: new Date().toISOString(),
  });

  if (response.status !== "extracted" || !response.extracted) {
    throw new Error("Local extraction service returned an invalid extraction response.");
  }

  return response as ExtractResponse;
}

async function postOrGetJson(url: string, body?: unknown): Promise<any> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Local extraction service is not running.");
  }

  const text = await response.text();
  const data = text ? parseJson(text) : {};

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText;
    throw new Error(message || "Local extraction service request failed.");
  }

  return data;
}

function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Local extraction service returned a non-JSON response.");
  }
}
