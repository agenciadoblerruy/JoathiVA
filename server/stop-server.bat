@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "$scriptPath = [System.IO.Path]::GetFullPath('%~dp0joathiva-server.ps1'); Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -like ('*' + $scriptPath + '*')) -or ($_.CommandLine -like '*joathiva-server.ps1*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
endlocal
