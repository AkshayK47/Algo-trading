@echo off
REM =============================================================================
REM NSE Alpha Quant - Windows CMD One-Click Launcher
REM =============================================================================
title NSE Alpha Quant Launcher
color 0A

echo =======================================================================
echo          NSE ALPHA QUANT - AUTOMATED TRADING ADVISORY & TRACKER
echo =======================================================================
echo.

REM 1. Verify Python Installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in your Windows PATH!
    echo Please download and install Python from https://www.python.org/
    echo Remember to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [1/4] Found Python:
python --version

REM 2. Create Virtual Environment if not present
if not exist "venv" (
    echo [2/4] Creating local virtual environment 'venv'...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo [2/4] Virtual environment 'venv' already exists.
)

REM 3. Activate Virtual Environment and Install Dependencies
echo [3/4] Activating venv and verifying packages...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Package installation failed. Check internet connectivity.
    pause
    exit /b 1
)

REM 4. Launch Streamlit Application on Port 8501
echo.
echo [4/4] Starting Streamlit Trading Dashboard...
echo Application URL: http://localhost:8501
echo Press Ctrl+C in this terminal window to stop the server.
echo.

streamlit run app.py --server.port 8501 --server.headless false

pause
