$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$env:N8N_USER_FOLDER = Join-Path $root ".n8n-data"
$env:N8N_PORT = "5678"
$env:N8N_HOST = "localhost"
$env:N8N_PROTOCOL = "http"
$env:GENERIC_TIMEZONE = "Asia/Kuala_Lumpur"
$env:TZ = "Asia/Kuala_Lumpur"
$env:N8N_RUNNERS_ENABLED = "true"
$env:N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "true"
$env:npm_config_cache = Join-Path $root ".npm-cache"

$localN8n = Join-Path $root "node_modules\.bin\n8n.cmd"
if (Test-Path $localN8n) {
    & $localN8n
} else {
    npx.cmd --yes n8n@latest
}
