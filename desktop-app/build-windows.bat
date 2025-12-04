@echo off
echo ==========================================
echo   Event4U Smart Card Reader - Installer
echo ==========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Node.js non trovato!
    echo.
    echo Scarica Node.js da: https://nodejs.org
    echo Installa la versione LTS e riavvia questo script.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js trovato
node --version
echo.

echo [1/3] Installazione dipendenze...
call npm install
if %errorlevel% neq 0 (
    echo [ERRORE] Installazione dipendenze fallita
    pause
    exit /b 1
)
echo.

echo [2/3] Compilazione applicazione...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRORE] Compilazione fallita
    pause
    exit /b 1
)
echo.

echo [3/3] Completato!
echo.
echo ==========================================
echo   L'installer si trova nella cartella:
echo   dist\Event4U Smart Card Reader Setup.exe
echo ==========================================
echo.

:: Open dist folder
start "" "dist"

pause
