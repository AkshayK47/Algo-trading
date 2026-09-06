@echo off
echo ========================================
echo Fixing Pydantic v2 Compatibility
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

echo Installing pydantic-settings...
pip install pydantic-settings>=2.2.0

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS: Pydantic fixed!
    echo ========================================
    echo.
    echo You can now run: streamlit run app.py
) else (
    echo.
    echo ERROR: Installation failed
    echo Try: pip install --upgrade pydantic pydantic-settings
)

echo.
pause
