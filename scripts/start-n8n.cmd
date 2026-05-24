@echo off
set "ROOT=%~dp0.."
set "N8N_USER_FOLDER=%ROOT%\.n8n-data"
set "N8N_PORT=5678"
set "N8N_HOST=localhost"
set "N8N_PROTOCOL=http"
set "GENERIC_TIMEZONE=Asia/Kuala_Lumpur"
set "TZ=Asia/Kuala_Lumpur"
set "N8N_DIAGNOSTICS_ENABLED=false"
set "N8N_VERSION_NOTIFICATIONS_ENABLED=false"
set "N8N_TEMPLATES_ENABLED=false"
set "EXTERNAL_FRONTEND_HOOKS_URLS="
set "npm_config_cache=%ROOT%\.npm-cache"

if exist "%ROOT%\node_modules\.bin\n8n.cmd" (
  call "%ROOT%\node_modules\.bin\n8n.cmd"
) else (
  call npx.cmd --yes n8n@latest
)
