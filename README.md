# DocScalpel

DocScalpel is a local-first document extraction app for receipts and invoices. It helps you upload scanned documents, extract key fields with OpenAI vision, review and edit the results, then export a clean Excel workbook.

The browser app handles uploads, PDF/image preparation, bulk review, manual entries, inline edits, issue guidance, and Excel export. A small local Node API keeps your OpenAI API key out of the browser and performs the extraction request. DocScalpel can also run inside an Electron desktop window.

DocScalpel runs on your PC. OpenAI extraction still requires internet access.

![DocScalpel main workspace](docs/images/docscalpel-main.png)

## Features

- Bulk upload for PNG, JPG, JPEG, WEBP, and PDF documents.
- Sequential extraction so one failed document does not stop the rest of the batch.
- Client-side PDF/image preparation before extraction.
- Editable review queue for vendor, document number, date, currency, subtotal, tax, total, payment method, confidence, and comments.
- Manual row entry for documents you want to type in yourself.
- Excel export with one header row and one row per ready document.
- Top-right issue helper with Problem and How to fix guidance.
- Confidence FAQ that explains what the AI confidence score means.

## Review Queue

After extraction, each document appears as an editable row. You can correct fields before downloading the Excel workbook. Manual rows are supported too, and their confidence value stays blank because the AI did not evaluate those entries.

![DocScalpel review queue](docs/images/docscalpel-review-queue.png)

## Confidence FAQ

The Confidence menu explains how to read the model's confidence score. Treat confidence as a review signal, not a guarantee. Low confidence usually means the scan was blurry, cropped, handwritten, or unusually formatted.

![DocScalpel confidence FAQ](docs/images/docscalpel-confidence-faq.png)

## Issue Helper

The Issues menu stays out of the way until something needs attention. It groups errors and warnings in the top right and gives a short fix for each problem.

![DocScalpel issue helper](docs/images/docscalpel-issue-helper.png)

## Prerequisites

- Windows 10 or 11.
- Node.js 22 or newer.
- An OpenAI API key with access to `gpt-4o-mini`.
- Internet access for AI extraction.
- PowerShell or Windows Terminal.

## First-Time Setup

Clone the repository:

```powershell
git clone https://github.com/eugeneloo6670/DocScalpel.git
Set-Location DocScalpel
```

Install dependencies:

```powershell
npm.cmd install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` and add your OpenAI API key:

```text
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
LOCAL_API_PORT=8787
```

Important: `.env` is ignored by Git. Do not commit your real API key.

## Run In Browser

Start the local API and browser app together:

```powershell
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

The browser mode runs two local services:

```text
Web app:   http://127.0.0.1:5173
Local API: http://127.0.0.1:8787
```

You can check the API here:

```text
http://127.0.0.1:8787/api/health
```

## Run As Desktop App

For desktop development mode:

```powershell
npm.cmd run desktop:dev
```

For a production-style desktop run:

```powershell
npm.cmd run desktop
```

To create an unpacked Windows desktop app:

```powershell
npm.cmd run package:win
```

The packaged app is written to:

```text
release\DocScalpel-win32-x64\DocScalpel.exe
```

If you want a folder shortcut, create one pointing to that executable. The current project may already include `DocScalpel.lnk`, which points at the packaged executable in `release\DocScalpel-win32-x64`.

## Environment File For Packaged Desktop Builds

Packaged desktop builds do not include your project `.env` file. For an installed or copied desktop build, create this file:

```text
%APPDATA%\DocScalpel\.env
```

Use the same values:

```text
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
LOCAL_API_PORT=8787
```

The Electron desktop app starts the local API automatically.

## Common Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run desktop:dev
npm.cmd run desktop
npm.cmd run build
npm.cmd run package:win
```

## Local API Endpoints

```text
GET http://127.0.0.1:8787/api/health
POST http://127.0.0.1:8787/api/document-extract
```

## Bulk Upload Flow

1. Select or drop one or more supported document files.
2. DocScalpel prepares each file in the browser.
3. The local API sends the prepared image to OpenAI for extraction.
4. Each successful result appears in the review queue.
5. Failed documents remain visible with a fix suggestion in the Issues menu.
6. Edit rows as needed.
7. Download one Excel workbook containing the ready rows.

Multi-page PDFs currently process page 1 only.

## Test Fixtures

Synthetic fixtures are included under `fixtures/`:

- `sample-receipt.png`
- `sample-invoice.png`

These are generated examples and do not contain private or real business data.

## Build

```powershell
npm.cmd run build
```

## Desktop App Notes

- Electron starts the local extraction API automatically.
- The desktop app still uses OpenAI over the internet for vision extraction.
- The built web app is loaded from `dist/`, so `npm.cmd run desktop` runs a build first.
- Windows desktop output is written to `release/DocScalpel-win32-x64/`.
