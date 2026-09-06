# NSE Alpha Quant - Indian Stock Market Advisory & Portfolio Tracker

Automated algorithmic stock advisory, backtesting engine, and real-time portfolio tracker for NSE/BSE stocks with Upstox API integration.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd Algo-trading

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install
```

### Running the Application

#### Option 1: Streamlit App (Recommended)
```bash
# Windows
RUN_STREAMLIT.bat

# Or manually
streamlit run app.py
```
Access: http://localhost:8502

#### Option 2: Full Stack (React + Python Backend)
```bash
# Windows
RUN_BOTH.bat

# Or manually:
# Terminal 1 - Backend
python -m api.main

# Terminal 2 - Frontend
npm run dev
```
Access:
- React UI: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

## 📁 Project Structure

```
Algo-trading/
├── api/                    # FastAPI REST API
│   └── main.py
├── config/                 # Configuration management
│   └── settings.py
├── database_new/           # SQLAlchemy ORM & Repository
│   ├── models.py
│   ├── connection.py
│   └── repository.py
├── models/                 # Pydantic validation models
│   ├── suggestion.py
│   ├── signal.py
│   └── market_data.py
├── services/               # Business logic layer
│   ├── market_data_service.py
│   ├── scanning_service.py
│   └── portfolio_service.py
├── src/                    # React frontend
│   ├── App.tsx
│   ├── components/
│   └── services/api.ts
├── utils/                  # Utilities
│   ├── logging_config.py
│   └── validators.py
├── app.py                  # Streamlit application
├── database.py             # Original database module
├── data_fetcher.py         # Market data fetching
├── analysis_engine.py      # Technical analysis
├── backtester.py           # Strategy backtesting
└── portfolio_tracker.py    # Portfolio calculations
```

## 🎯 Features

### Stock Analysis
- ✅ Multi-factor quantitative screening
- ✅ Technical indicators (RSI, MACD, EMA, Supertrend, ADX, ATR)
- ✅ Sector-based filtering
- ✅ Conviction scoring (0-100)

### Backtesting
- ✅ Vectorized 12-month simulation
- ✅ Win rate & max drawdown analysis
- ✅ Risk-reward ratio calculation
- ✅ Sanity filters (Win Rate ≥ 55%, MDD ≤ 15%)

### Portfolio Tracking
- ✅ Live P&L calculation
- ✅ Stop-loss monitoring
- ✅ Risk metrics (distance to stop, R:R ratio)
- ✅ Performance summary dashboard

### Data Management
- ✅ SQLite database storage
- ✅ CSV export functionality
- ✅ Historical data tracking

## 🔧 Configuration

Create a `.env` file:

```env
# Database
DATABASE_URL=sqlite:///nse_alpha_quant.db

# Upstox API (Optional - uses sandbox if not provided)
UPSTOX_API_KEY=your_api_key_here
UPSTOX_ACCESS_TOKEN=your_access_token_here
USE_SANDBOX_FALLBACK=true

# API Server
API_HOST=0.0.0.0
API_PORT=8000

# Logging
LOG_LEVEL=INFO
```

## 📊 Architecture

### Two UI Options

**1. Streamlit (Integrated)**
- All-in-one application
- Python backend + UI combined
- Easiest to use

**2. React + FastAPI (Modern)**
- Separate frontend/backend
- REST API architecture
- Better scalability

### Backend Architecture
```
React/Streamlit
    ↓
FastAPI REST API
    ↓
Service Layer (Business Logic)
    ↓
Repository Pattern (Data Access)
    ↓
SQLite Database
```

## 🔐 Security Features

- ✅ Input validation with Pydantic
- ✅ SQL injection prevention (parameterized queries)
- ✅ Environment variable configuration
- ✅ Sensitive data redaction in logs
- ✅ CORS protection

## 🧪 Testing

```bash
# Test backend
python -c "from api.main import app; print('Backend OK')"

# Test database
python -c "from database_new import get_db_manager; get_db_manager().create_tables(); print('Database OK')"

# Check API health
curl http://localhost:8000/api/health
```

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/suggestions` | GET | Get all suggestions |
| `/api/suggestions` | POST | Create suggestion |
| `/api/scan` | POST | Run stock scan |
| `/api/scan/single/{ticker}` | POST | Scan single stock |
| `/api/portfolio/performance` | GET | Portfolio metrics |

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check dependencies
pip install -r requirements.txt

# Check Python version
python --version  # Should be 3.9+
```

### React won't start
```bash
# Install dependencies
npm install

# Clear cache
npm run clean
```

### Database errors
```bash
# Recreate database
python -c "from database_new import get_db_manager; get_db_manager().create_tables()"
```

## 📈 Performance

- Scan 250 stocks: ~2 minutes (async)
- Database queries: ~50ms (indexed)
- Memory usage: ~500MB
- API response: <200ms

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary. All rights reserved.

## 🙏 Acknowledgments

- Upstox API for market data
- NSE India for index constituents
- FastAPI, React, Streamlit frameworks

## 📞 Support

For issues or questions:
1. Check `HOW_TO_RUN.txt`
2. Review `TEST_RESULTS.txt`
3. Check logs in `app.log`

---

**Version**: 2.0.0  
**Last Updated**: 2026-09-06  
**Status**: Production Ready ✅
