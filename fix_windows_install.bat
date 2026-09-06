@echo off
REM Windows Installation Fix - Batch Script Version
REM For users who can't run PowerShell scripts

echo ========================================
echo NSE Alpha Quant - Windows Installation Fix
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
)

echo.
echo Upgrading pip...
python -m pip install --upgrade pip setuptools wheel

echo.
echo Installing core dependencies...
pip install streamlit>=1.35.0 fastapi>=0.110.0 uvicorn>=0.28.0 pandas>=2.1.0 numpy>=1.26.0 plotly>=5.20.0 requests>=2.31.0 aiohttp>=3.9.0 httpx>=0.27.0 pydantic>=2.6.0 pydantic-settings>=2.2.0 python-dotenv>=1.0.0 tenacity>=8.2.3 pybreaker>=1.0.1 structlog>=24.1.0 python-json-logger>=2.0.7 pytest>=8.0.0 pytest-asyncio>=0.23.0 orjson>=3.9.0 slowapi>=0.1.9

echo.
echo Attempting to install greenlet and SQLAlchemy...
pip install --only-binary :all: greenlet sqlalchemy>=2.0.0

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: SQLAlchemy installation failed
    echo You can still use the original Streamlit app: streamlit run app.py
    echo.
    echo To use the full refactored version, install Visual Studio Build Tools:
    echo https://visualstudio.microsoft.com/visual-cpp-build-tools/
) else (
    echo.
    echo SUCCESS: Full version installed!
    echo You can now run: python -m api.main
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy .env.example to .env: copy .env.example .env
echo 2. Edit .env with your settings: notepad .env
echo 3. Run: streamlit run app.py
echo.
pause
