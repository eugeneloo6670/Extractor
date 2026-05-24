@echo off
set "ROOT=%~dp0.."
if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"
start "n8n local" /min cmd /c ""%ROOT%\scripts\start-n8n.cmd" > "%ROOT%\logs\n8n.out.log" 2> "%ROOT%\logs\n8n.err.log""
