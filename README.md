# Local Document Extraction App

This folder contains a local React app and n8n `2.21.7` setup for invoice and receipt extraction. n8n handles extraction through OpenAI; the app downloads approved data as an Excel workbook.

## Start n8n

```powershell
.\scripts\start-n8n.cmd
```

Open http://localhost:5678.

To start it in the background:

```powershell
.\scripts\start-n8n-background.cmd
```

## Start the web app

```powershell
npm.cmd run start:web
```

Open http://127.0.0.1:5173.

To run both n8n and the web app in one terminal:

```powershell
npm.cmd run dev
```

## Stop n8n

```powershell
npm.cmd run stop:n8n
```

Data is stored in `.n8n-data`, and npm's package cache is stored in `.npm-cache`.

## Import n8n workflows

```powershell
cmd /c "set N8N_USER_FOLDER=%CD%\.n8n-data&& node_modules\.bin\n8n.cmd import:workflow --separate --input=workflows"
```

Then open http://localhost:5678 and configure:

1. `Document Extract`: connect an HTTP Header Auth credential named `OpenAI Authorization Header`.
2. Activate `Document Extract`.

The app calls n8n only for extraction:

```text
POST http://localhost:5678/webhook/document-extract
```

After review, the app downloads a `.xlsx` file with the extracted row. Google Sheets OAuth is not required for this v1 flow.
