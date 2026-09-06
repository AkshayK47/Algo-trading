# NSE Alpha Quant - Indian Stock Market Advisory, Backtest Engine & Portfolio Tracker

A production-ready quantitative trading advisory system and interactive trading terminal built for **Indian Equities (NSE/BSE)**. Designed for local execution on Windows, macOS, or Linux.

---

## ❓ Frequently Asked Question: Do I Need to Start Both?

> **NO, you do NOT need to start both!** 
> 
> The project provides **two independent interfaces**, and you only need to run the one you prefer:
> 
> - **Option 1 (Recommended for Preview UI): React Web Terminal (`http://localhost:3000`)**
>   - **What it is:** The **exact, pixel-for-pixel UI** you see in Google AI Studio Preview.
>   - **Tech stack:** React 19 + Vite + Tailwind CSS + Lucide Icons.
>   - **Requires:** Node.js.
>   - **Choose this if:** You want the sleek Bloomberg/TradingView-style dark terminal with interactive modals, position sizing calculators, and smooth responsive controls.
> 
> - **Option 2: Python Quantitative Engine (`http://localhost:8501`)**
>   - **What it is:** The standalone Python desktop data science application.
>   - **Tech stack:** Python 3 + Streamlit + Pandas + Plotly + SQLite.
>   - **Requires:** Python 3.10+.
>   - **Choose this if:** You want to run pure Python algorithms, modify Pandas vector calculations, or work within a Python/Jupyter workflow.
>
> *(Note: Because Option 1 runs on Port 3000 and Option 2 runs on Port 8501, they never conflict with each other. You can test either or both at any time.)*

---

## 🚀 Step-by-Step Running Guide

### 🌟 Option 1: Run the Exact Web Preview UI (Port 3000)

#### Method A: 1-Click Batch File (Windows)
Double-click:
```cmd
run_preview_ui.bat
```
*(This automatically checks npm, installs packages, and launches `http://localhost:3000` in your browser).*

#### Method B: Manual Commands (Windows / Mac / Linux)
1. Open terminal in the project root:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open your browser to: **`http://localhost:3000`**

---

### 🐍 Option 2: Run the Python / Streamlit Engine (Port 8501)

#### Method A: 1-Click Batch File (Windows)
Double-click:
```cmd
run_windows.bat
```
*(This automatically creates a virtual environment `venv`, installs `requirements.txt`, and launches `http://localhost:8501`).*

For PowerShell users:
```powershell
.\run_windows.ps1
```

#### Method B: Manual Commands (Windows / Mac / Linux)
1. Open terminal in the project root.
2. Create and activate a virtual environment:
   - **Windows (CMD):**
     ```cmd
     python -m venv venv
     venv\Scripts\activate.bat
     ```
   - **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Streamlit application:
   ```bash
   streamlit run app.py
   ```
5. Open your browser to: **`http://localhost:8501`**

---

## 🔑 Upstox API Configuration

1. Create a developer app at [Upstox Developer Console](https://developer.upstox.com/).
2. Copy your **API Key** and generate your **Daily Access Token**.
3. In the sidebar, enter your API Key and Access Token.
4. *Tip:* If you don't have an active Upstox token right now, keep **Fallback Sandbox Mode** turned ON to explore all technical strategies and simulations with realistic market feeds!

---

## 📊 Key Architecture & Modules

1. **Web User Interface (`app.py` & React `src/`)**:
   - **Tab 1: Market Analytics & Predictions**: Multi-factor alpha scanner, Nifty 50/Next 50 trend baselines, deep-dive candlestick/indicator charts, and SQLite persistence.
   - **Tab 2: Live Portfolio Tracker**: Dynamic portfolio monitoring executing `calculate_portfolio_performance()`, querying live LTP quotes, stop loss tracking, and computing real-time `Current Day Return (%)`.
   - **Tab 3: Historical Performance Charts**: Interactive Plotly visuals with drawdown curves, expected vs actual returns, and backtest equity trajectories.
   - **Tab 4: Python Codebase (Windows)**: In-browser code explorer with 1-click ZIP export for running locally.

2. **Data Ingestion & Upstox API v2 (`data_fetcher.py`)**:
   - Upstox API v2 wrapper with HTTPS request handling for Daily OHLCV (trailing 2-3 years) and live market quote LTP feeds.
   - Built-in universe: **Nifty 100 Large-Caps** and **Nifty Midcap 150**.
   - Directional market baselines: **Nifty 50** and **Nifty Next 50**.
   - High-fidelity sandbox fallback for offline or pre-token operation.

3. **Senior Trader Analysis Engine (`analysis_engine.py`)**:
   - **Momentum Factor**: RSI (14), MACD (12, 26, 9), Dual EMA (50/200 Golden Cross), Supertrend (10, 3.0).
   - **Volatility & Trend Strength Factor**: Bollinger Bands (20, 2), ATR (14), ADX (14) with +DI/-DI directional filters.
   - **Weighted Conviction Score**: 0 to 100 composite index.
   - **Adaptive Hybrid Breakout-Momentum Strategy**: Dynamically triggered for 3-6 month holding horizons when standard setups consolidate.
   - **Comfortable Entry Price & Target Return (%)**: Calculated with ATR expansion and structural support/resistance zones.

4. **Strategy Backtesting & Sanity Filter (`backtester.py`)**:
   - Vectorized 12-month backtesting module using Pandas.
   - **Sanity Filter Barrier**: Automatically rejects any stock candidate with:
     - **Maximum Drawdown (MDD) > 15%**, OR
     - **Backtest Win Rate < 55%**.

5. **Database & Transaction Management (`database.py`)**:
   - SQLite layout with `suggestions` table storing:
     - `id`, `run_date`, `ticker`, `market_cap_category`, `entry_price`, `expected_return_pct`, `backtest_win_rate`, `technical_justification`, `captured_close_price`, `stop_loss`.

6. **Dynamic Past-Performance Tracker (`portfolio_tracker.py`)**:
   - Routine: `calculate_portfolio_performance()`.
   - Computes: `Current Day Return (%) = ((Current Price - Captured Close Price) / Captured Close Price) * 100`.
   - Stop Loss indicator, risk-reward ratio, and proximity buffer calculations.
