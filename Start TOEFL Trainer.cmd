@echo off
setlocal
rem Let Windows PowerShell load its own built-in modules when launched from another shell.
set "PSModulePath="
cd /d "%~dp0"
title TOEFL Trainer
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1"
if errorlevel 1 pause
