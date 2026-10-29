@echo off
title CodexWithAnil — 1-Click Folder Word to PDF Converter
color 0A
echo ============================================================
echo   CodexWithAnil — Desktop Batch Word to PDF Converter
echo   Convert 50+ or 100+ Word files in any folder instantly
echo ============================================================
echo.

if "%~1"=="" goto prompt_folder
set "TARGET_DIR=%~1"
goto run_convert

:prompt_folder
set /p "TARGET_DIR=Word Files ka folder path enter karein (ya Enter dabayein current folder ke liye): "
if "%TARGET_DIR%"=="" set "TARGET_DIR=%~dp0sample_docs"

:run_convert
cd /d "%~dp0"
python batch_folder_converter.py "%TARGET_DIR%"

echo.
echo Press any key to exit...
pause >nul
