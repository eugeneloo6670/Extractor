import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

loadEnv(path.join(rootDir, ".env"));
if (process.env.DOCSCALPEL_ENV_PATH) {
  loadEnv(process.env.DOCSCALPEL_ENV_PATH);
}

const defaultPort = Number(process.env.LOCAL_API_PORT || 8787);
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const maxBodyBytes = 30 * 1024 * 1024;
let activeServer;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "vendor_name",
    "document_number",
    "document_date",
    "currency",
    "subtotal",
    "tax",
    "total",
    "payment_method",
    "confidence",
    "notes",
  ],
  properties: {
    vendor_name: { type: "string" },
    document_number: { type: "string" },
    document_date: { type: "string" },
    currency: { type: "string" },
    subtotal: { type: "string" },
    tax: { type: "string" },
    total: { type: "string" },
    payment_method: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    notes: { type: "string" },
  },
};

export function startLocalApi(options = {}) {
  if (activeServer) return activeServer;

  const port = Number(options.port || defaultPort);
  const server = http.createServer(handleRequest);
  activeServer = server;

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.warn(`Local extraction API port ${port} is already in use.`);
      activeServer = undefined;
      return;
    }

    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Local extraction API running at http://127.0.0.1:${port}`);
  });

  server.on("close", () => {
    if (activeServer === server) activeServer = undefined;
  });

  return server;
}

async function handleRequest(request, response) {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "local-document-extraction-api",
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        model,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/document-extract") {
      const body = await readJsonBody(request);
      const result = await extractDocument(body);
      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    const status = Number(error.statusCode || error.status || 500);
    sendJson(response, status, {
      error: error.publicMessage || error.message || "Local extraction failed.",
    });
  }
}

async function extractDocument(input) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error(
      "OPENAI_API_KEY is missing. Add it to .env and restart the local API.",
    );
    error.statusCode = 500;
    throw error;
  }

  if (!input?.image_data_url || !input?.original_file_name) {
    const error = new Error("Missing document image payload.");
    error.statusCode = 400;
    throw error;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "Extract summary fields from invoices and receipts. Return empty strings for unreadable text, normalize dates to YYYY-MM-DD when possible, and use a confidence number from 0 to 1.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Extract the document summary fields from ${input.original_file_name}.`,
            },
            {
              type: "input_image",
              image_url: input.image_data_url,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "document_extraction",
          strict: true,
          schema: extractionSchema,
        },
      },
    });

    const outputText = getOutputText(response);
    if (!outputText) {
      throw new Error("OpenAI did not return extractable text.");
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error("OpenAI returned invalid extraction JSON.");
    }

    return {
      status: "extracted",
      original_file_name: input.original_file_name,
      extracted: normalizeExtracted(parsed),
      warnings: [],
    };
  } catch (error) {
    const wrapped = new Error(formatOpenAiError(error));
    wrapped.statusCode = error.status || error.statusCode || 502;
    throw wrapped;
  }
}

function normalizeExtracted(value) {
  return {
    vendor_name: String(value.vendor_name ?? ""),
    document_number: String(value.document_number ?? ""),
    document_date: String(value.document_date ?? ""),
    currency: String(value.currency ?? ""),
    subtotal: String(value.subtotal ?? ""),
    tax: String(value.tax ?? ""),
    total: String(value.total ?? ""),
    payment_method: String(value.payment_method ?? ""),
    confidence: clampConfidence(value.confidence),
    notes: String(value.notes ?? ""),
  };
}

function getOutputText(value) {
  if (typeof value.output_text === "string") return value.output_text;

  const output = Array.isArray(value.output) ? value.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") return part.text;
    }
  }

  return "";
}

function clampConfidence(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

function formatOpenAiError(error) {
  if (error.status === 401) return "OpenAI authentication failed. Check OPENAI_API_KEY in .env.";
  if (error.status === 429) return "OpenAI rate limit reached. Try again shortly.";
  if (error.status >= 500) return "OpenAI service error. Try again shortly.";
  return error.message || "OpenAI extraction failed.";
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
        return;
      }

      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        const error = new Error("Request body must be valid JSON.");
        error.statusCode = 400;
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    ...corsHeaders,
    "Content-Type": "application/json",
  });

  if (statusCode === 204) {
    response.end();
    return;
  }

  response.end(JSON.stringify(body));
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startLocalApi();
}
