@echo off
title KlirBuild - Correction Amplify AWS
cd /d "%~dp0"
echo.
echo  KlirBuild - Correction automatique Amplify (WEB -^> WEB_COMPUTE)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\aws-amplify-fix.ps1"
echo.
pause
