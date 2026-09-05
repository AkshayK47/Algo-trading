# =============================================================================
# NSE Alpha Quant - Windows PowerShell One-Click Launcher
# =============================================================================
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "       NSE ALPHA QUANT - AUTOMATED TRADING ADVISORY & TRACKER          " -ForegroundColor Yellow
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python
try {
    $pythonVersion = & python --version 2>&1
    Write-Host "[1/4] Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Download Python from https://www.python.org/ (Check 'Add Python to PATH')" -ForegroundColor Yellow
    pause
    exit 1
}

# 2. Check or Create Virtual Environment
if (-not (Test-Path "venv")) {
    Write-Host "[2/4] Creating virtual environment 'venv'..." -ForegroundColor Cyan
    & python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create virtual environment." -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "[2/4] Existing virtual environment found." -ForegroundColor Green
}

# 3. Activate and Install Requirements
Write-Host "[3/4] Activating venv and installing dependencies..." -ForegroundColor Cyan
$activateScript = ".\venv\Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
} else {
    & ".\venv\Scripts\activate.bat"
}

& python -m pip install --upgrade pip
& pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
    pause
    exit 1
}

# 4. Launch Streamlit
Write-Host ""
Write-Host "[4/4] Launching Streamlit Trading Dashboard at http://localhost:8501..." -ForegroundColor Green
Write-Host "Press Ctrl+C to terminate the application." -ForegroundColor Gray
Write-Host ""

& streamlit run app.py --server.port 8501
