@echo off
setlocal
rem Let Windows PowerShell load its own built-in modules when launched from another shell.
set "PSModulePath="
cd /d "%~dp0"
title TOEFL Trainer
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo Windows PowerShell is missing. Restore Windows PowerShell, then open this launcher again.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1"
if errorlevel 1 pause
