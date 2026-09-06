@echo off
echo Starting NSE Alpha Quant - Streamlit App
echo.

if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    pause
    exit /b 1
)

call venv\Scripts\activate.bat
streamlit run app.py
