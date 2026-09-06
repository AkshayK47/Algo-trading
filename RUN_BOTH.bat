@echo off
echo ========================================
echo Starting NSE Alpha Quant - Full Stack
echo ========================================
echo.

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo ERROR: Node modules not found!
    echo Please run: npm install
    pause
    exit /b 1
)

echo [1/2] Starting FastAPI Backend (Port 8000)...
start "FastAPI Backend" cmd /k "cd /d %~dp0 && venv\Scripts\activate && python -m api.main"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [2/2] Starting React Frontend (Port 3000)...
start "React Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================
echo Both services starting...
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/api/docs
echo React UI: http://localhost:3000
echo.
echo The React UI will auto-connect to Python backend!
echo Look for green "Backend Connected" indicator in UI.
echo.
echo Press any key to close this window (services will keep running)
pause >nul
