@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  python server.py --open-browser
) else (
  py -3 server.py --open-browser
)
if errorlevel 1 pause
