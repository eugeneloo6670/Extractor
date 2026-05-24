# n8n Workflow Templates

Import these workflow templates in n8n:

```powershell
cmd /c "set N8N_USER_FOLDER=%CD%\.n8n-data&& node_modules\.bin\n8n.cmd import:workflow --separate --input=workflows"
```

After import:

1. Open http://localhost:5678.
2. Open **Document Extract** and connect an HTTP Header Auth credential:
   - Name: `Authorization`
   - Value: `Bearer YOUR_OPENAI_API_KEY`
3. Activate **Document Extract**.

The web app now downloads approved data as an Excel workbook, so **Document Approve** is legacy/optional and does not need to be configured for v1.

The Excel workbook uses these columns:

```text
Processed At
Original File Name
Document Type
Vendor Name
Document Number
Document Date
Currency
Subtotal
Tax
Total
Payment Method
Confidence
Notes
```
