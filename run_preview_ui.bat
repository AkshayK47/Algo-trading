@echo off
REM =============================================================================
REM NSE Alpha Quant - Windows Launcher for Exact React Preview UI (Port 3000)
REM =============================================================================
title NSE Alpha Quant - React Preview UI
color 0B

echo =======================================================================
echo     NSE ALPHA QUANT - REACT WEB PREVIEW TERMINAL (PORT 3000)
echo =======================================================================
echo.

REM 1. Verify Node.js / npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not found in your Windows PATH!
    echo Please download and install Node.js from https://nodejs.org/
    echo This is required to run the exact React/Vite preview application.
    pause
    exit /b 1
)

echo [1/2] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/2] Launching React Trading Terminal at http://localhost:3000...
echo Opening your browser to http://localhost:3000 ...
start http://localhost:3000
call npm run dev

pause
