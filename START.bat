@echo off
echo ================================
echo   Meet-AI Clone Quick Start
echo ================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/4] Installing dependencies...
    call npm install
    echo.
) else (
    echo [1/4] Dependencies already installed
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo [2/4] .env file not found!
    echo Please copy .env.example to .env and fill in your credentials
    echo.
    pause
    exit /b 1
) else (
    echo [2/4] .env file found
    echo.
)

REM Check if Ollama is running
echo [3/4] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo WARNING: Ollama is not running!
    echo Please start Ollama in another terminal: ollama serve
    echo.
) else (
    echo Ollama is running!
    echo.
)

echo [4/4] Starting development server...
echo.
echo ================================
echo   Server starting...
echo   URL: http://localhost:3000
echo ================================
echo.
echo Press Ctrl+C to stop
echo.

npm run dev
