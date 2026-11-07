@echo off
rem Double-cliquez sur ce fichier pour lancer la boutique (Windows).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe. Installez-le depuis https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)
node scripts\start.js --open
pause
