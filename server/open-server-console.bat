@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%SCRIPT_DIR%'"
endlocal
