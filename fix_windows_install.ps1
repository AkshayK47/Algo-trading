# Windows Installation Fix Script
# Automatically handles greenlet compilation issues

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "NSE Alpha Quant - Windows Installation Fix" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if virtual environment is activated
if (-not $env:VIRTUAL_ENV) {
    Write-Host "⚠ Virtual environment not detected" -ForegroundColor Yellow
    Write-Host "Activating venv..." -ForegroundColor Yellow
    
    if (Test-Path "venv\Scripts\Activate.ps1") {
        & "venv\Scripts\Activate.ps1"
    } else {
        Write-Host "✗ venv not found. Creating virtual environment..." -ForegroundColor Red
        python -m venv venv
        & "venv\Scripts\Activate.ps1"
    }
}

Write-Host "✓ Virtual environment active" -ForegroundColor Green

# Upgrade pip
Write-Host "`nUpgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel

# Try Method 1: Install greenlet from pre-compiled wheel
Write-Host "`nAttempting to install greenlet from pre-compiled wheel..." -ForegroundColor Yellow
pip install --only-binary :all: greenlet 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Greenlet installed successfully from wheel" -ForegroundColor Green
    $useFullVersion = $true
} else {
    Write-Host "✗ Pre-compiled wheel not available" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    # Try Method 2: Install from specific wheel repository
    pip install greenlet --find-links https://download.lfd.uci.edu/pythonlibs/archived/ 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Greenlet installed from alternative source" -ForegroundColor Green
        $useFullVersion = $true
    } else {
        Write-Host "✗ Could not install greenlet" -ForegroundColor Red
        Write-Host "Will install simplified version (no SQLAlchemy)" -ForegroundColor Yellow
        $useFullVersion = $false
    }
}

# Install core dependencies (work on all systems)
Write-Host "`nInstalling core dependencies..." -ForegroundColor Yellow

$coreDeps = @(
    "streamlit>=1.35.0",
    "fastapi>=0.110.0",
    "uvicorn>=0.28.0",
    "pandas>=2.1.0",
    "numpy>=1.26.0",
    "plotly>=5.20.0",
    "requests>=2.31.0",
    "aiohttp>=3.9.0",
    "httpx>=0.27.0",
    "pydantic>=2.6.0",
    "pydantic-settings>=2.2.0",
    "python-dotenv>=1.0.0",
    "tenacity>=8.2.3",
    "pybreaker>=1.0.1",
    "structlog>=24.1.0",
    "python-json-logger>=2.0.7",
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "orjson>=3.9.0",
    "slowapi>=0.1.9"
)

foreach ($dep in $coreDeps) {
    pip install $dep --quiet
}

Write-Host "✓ Core dependencies installed" -ForegroundColor Green

# Install SQLAlchemy if greenlet worked
if ($useFullVersion) {
    Write-Host "`nInstalling SQLAlchemy..." -ForegroundColor Yellow
    pip install sqlalchemy>=2.0.0
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SQLAlchemy installed successfully" -ForegroundColor Green
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "✓ FULL VERSION INSTALLED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "`nYou can now use the refactored architecture with:" -ForegroundColor White
        Write-Host "  python -m api.main" -ForegroundColor Cyan
    } else {
        Write-Host "✗ SQLAlchemy installation failed" -ForegroundColor Red
        $useFullVersion = $false
    }
}

if (-not $useFullVersion) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "✓ SIMPLIFIED VERSION INSTALLED" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "`nNote: SQLAlchemy not installed (requires C++ compiler)" -ForegroundColor Yellow
    Write-Host "You can still use:" -ForegroundColor White
    Write-Host "  1. Original Streamlit app: streamlit run app.py" -ForegroundColor Cyan
    Write-Host "  2. React frontend with mock data: npm run dev" -ForegroundColor Cyan
    Write-Host "`nTo use the full refactored version, install Visual Studio Build Tools:" -ForegroundColor Yellow
    Write-Host "  https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Cyan
}

# Verify installation
Write-Host "`nVerifying installation..." -ForegroundColor Yellow

$testScript = @"
try:
    import pandas, numpy, fastapi, streamlit, pydantic
    print('✓ Core packages OK')
    try:
        import sqlalchemy
        print('✓ SQLAlchemy OK')
    except:
        print('⚠ SQLAlchemy not available (use original database.py)')
except Exception as e:
    print(f'✗ Error: {e}')
"@

python -c $testScript

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. Copy .env.example to .env: copy .env.example .env" -ForegroundColor Cyan
Write-Host "2. Edit .env with your settings: notepad .env" -ForegroundColor Cyan
Write-Host "3. Run the application:" -ForegroundColor Cyan
if ($useFullVersion) {
    Write-Host "   - Backend API: python -m api.main" -ForegroundColor Green
    Write-Host "   - Frontend: npm run dev" -ForegroundColor Green
} else {
    Write-Host "   - Streamlit: streamlit run app.py" -ForegroundColor Green
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
