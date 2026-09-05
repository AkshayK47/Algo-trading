# NSE Alpha Quant - Indian Stock Market Advisory, Backtest Engine & Portfolio Tracker

A production-ready quantitative trading advisory system and interactive browser dashboard built for **Indian Equities (NSE/BSE)**. Designed to run locally on a Windows machine.

---

## 🚀 Key Architecture & Modules

1. **Web User Interface (`app.py`)**:
   - Streamlit interactive trading terminal rendering at `http://localhost:8501`.
   - **Tab 1: Market Analytics & Predictions**: Multi-factor alpha scanner, Nifty 50/Next 50 trend baselines, deep-dive candlestick/indicator charts, and SQLite persistence.
   - **Tab 2: Live Portfolio Tracker**: Dynamic portfolio monitoring executing `calculate_portfolio_performance()`, querying live LTP quotes, and computing real-time `Current Day Return (%)`.
   - **Tab 3: Historical Performance Charts**: Interactive Plotly visuals with drawdown curves, expected vs actual returns, and backtest equity trajectories.

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
     - `id`, `run_date`, `ticker`, `market_cap_category`, `entry_price`, `expected_return_pct`, `backtest_win_rate`, `technical_justification`, `captured_close_price`.

6. **Dynamic Past-Performance Tracker (`portfolio_tracker.py`)**:
   - Routine: `calculate_portfolio_performance()`.
   - Computes: `Current Day Return (%) = ((Current Price - Captured Close Price) / Captured Close Price) * 100`.
   - Color-coded P&L signals (Green for positive, Red for negative).

---

## 💻 Quick Start on Windows (CMD or PowerShell)

### Method 1: One-Click Execution (Recommended)
Double-click `run_windows.bat` or run:
```cmd
run_windows.bat
```
For PowerShell:
```powershell
.\run_windows.ps1
```

### Method 2: Manual Step-by-Step Installation

1. **Open Windows Command Prompt (CMD) or PowerShell** in this project folder.
2. **Create a Virtual Environment**:
   ```cmd
   python -m venv venv
   ```
3. **Activate the Virtual Environment**:
   - In Command Prompt:
     ```cmd
     venv\Scripts\activate.bat
     ```
   - In PowerShell:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
4. **Install Dependencies**:
   ```cmd
   pip install -r requirements.txt
   ```
5. **Launch the Streamlit Dashboard**:
   ```cmd
   streamlit run app.py
   ```
6. Open your Windows browser at: **`http://localhost:8501`**

---

## 🔑 Upstox API Configuration

1. Create a developer app at [Upstox Developer Console](https://developer.upstox.com/).
2. Copy your **API Key** and generate your **Daily Access Token**.
3. In the Streamlit sidebar, enter your API Key and Access Token.
4. *Tip:* If you don't have an active Upstox token right now, leave **Fallback Sandbox Mode** enabled to test the full pipeline with realistic market data!
