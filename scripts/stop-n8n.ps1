$ErrorActionPreference = "Stop"

$connections = Get-NetTCPConnection -LocalPort 5678 -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
    Write-Host "n8n does not appear to be listening on port 5678."
    exit 0
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($processId in $processIds) {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped process $processId listening on port 5678."
}
