@echo off
title CodexWithAnil — Bulk Word to PDF Suite
color 0B
echo ============================================================
echo   CodexWithAnil — Bulk Word to PDF Website ^& Software
echo   1. Supports 50+ Word Files (.docx and .doc) in 1 Click
echo   2. User-Friendly Eye-Care Theme (Light / Dark)
echo   3. 100%% Local, Fast ^& Secure
echo ============================================================
echo.
echo Starting Web Server...
cd /d "%~dp0"

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [NOTE] Node.js not found in PATH. Opening website directly in browser...
    start "" "%~dp0index.html"
    exit /b
)

:: Start server which will automatically open your default browser when ready
node server.js

pause
