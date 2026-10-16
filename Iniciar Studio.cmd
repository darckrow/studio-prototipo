@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale o Node.js 24 ou superior para abrir o Studio.
 pause
 exit /b 1
)
if not exist "node_modules\next\package.json" (
 echo Execute npm install antes de iniciar.
 pause
 exit /b 1
)
if not exist ".next\BUILD_ID" (
 call npm run build
 if errorlevel 1 exit /b 1
)
start "" "http://127.0.0.1:3000"
node server.mjs
pause
