# 📊 Stock Portfolio Tracker

AI-powered portfolio tracker with automated contract note processing. Built for personal use, designed for privacy.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://kennethingram.github.io/StockTracker)
[![GitHub Pages](https://img.shields.io/badge/hosted-github%20pages-blue)](https://pages.github.com/)

## ✨ Features

### Current (v1.0)
- 🤖 **AI-Powered PDF Parsing** - Google Gemini Vision OCR for scanned contract notes
- 📁 **Google Drive Storage** - Your data stays in YOUR Drive
- 🔐 **OAuth Authentication** - Secure Google sign-in
- 💱 **Multi-Currency Support** - Track stocks in USD, CAD, GBP, EUR, AUD, CHF (6 currencies)
- 💹 **Live FX Rates** - True historical & current rates from frankfurter.app (European Central Bank)
- 📈 **Portfolio Analytics** - Holdings, P/L, ARR calculations with multi-currency support
- 💰 **Real-Time Stock Prices** - Hybrid API (Finnhub for US/CA, Alpha Vantage for UK)
- 🌍 **Exchange Support** - LSE, TSX, NYSE, NASDAQ, and more
- 🔄 **Currency Switcher** - View Overview in any supported currency
- 👤 **Multi-Account Holder Filtering** - Joint accounts, individual views
- ✅ **Human-in-the-Loop Validation** - Review AI extractions before saving
- 🗑️ **Transaction Management** - Delete transactions with confirmation
- ⭐ **Saved Filter Favorites** - Quick access to custom views
- 📱 **Responsive Design** - Works on desktop, tablet, phone

### Planned (See [BACKLOG.md](BACKLOG.md))
- 🔄 Batch PDF processing
- ✏️ Transaction editing
- 📉 Performance charts
- 🎨 UI redesign
- 🔧 Backend proxy for hosting (no API keys in code)

## 🚀 Quick Start

### For Users

1. **Visit:** [https://kennethingram.github.io/StockTracker](https://kennethingram.github.io/StockTracker)
2. **Sign in** with your Google account
3. **Create an account** in the Accounts tab
4. **Upload contract notes** to your Google Drive folder
5. **Process them** in the Sync tab
6. **View your portfolio** in Overview/Holdings/Transactions

**⚠️ CURRENT LIMITATION:** App requires local `config.js` file with API keys. See setup instructions below. Public hosting solution coming soon.

---

## 🔐 Setup Instructions (For Developers)

### Prerequisites

You'll need API keys (all free):
1. **Google OAuth Client ID** - For Google sign-in
2. **Google Gemini API Key** - For AI PDF parsing
3. **Finnhub API Key** - For US/Canadian stock prices
4. **Alpha Vantage API Key** - For UK stock prices

**Note:** FX rates are fetched automatically from frankfurter.app (European Central Bank) - no API key needed!

---

### Step 1: Fork and Clone
```bash
git clone https://github.com/yourusername/StockTracker.git
cd StockTracker
```

---

### Step 2: Configure API Keys

**⚠️ IMPORTANT:** Never commit `config.js` with real API keys!

**2A: Copy the config template:**
```bash
cp config.example.js config.js
```

**2B: Get your API keys:**

#### **Google OAuth Client ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new project or select existing
3. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
4. Application type: **Web application**
5. Add authorized JavaScript origins:
   - `https://yourusername.github.io`
   - `http://127.0.0.1:5500` (for local testing)
6. Add authorized redirect URIs:
   - `https://yourusername.github.io/StockTracker`
   - `http://127.0.0.1:5500` (for local testing)
7. Copy the **Client ID**

#### **Google Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select your project
4. Copy the key
5. **IMMEDIATELY RESTRICT IT:**
   - Click **"Edit API key"**
   - Set **"Application restrictions"** → **"HTTP referrers"**
   - Add: `https://yourusername.github.io/*`
   - Add: `http://127.0.0.1:5500/*`
   - Click **"Save"**

#### **Finnhub API Key:**
1. Go to [Finnhub](https://finnhub.io/register)
2. Sign up for **Free plan** (60 API calls/minute)
3. Copy your API key from dashboard

#### **Alpha Vantage API Key:**
1. Go to [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Get free API key (25 calls/day for UK stocks)
3. Copy the key

**2C: Edit `config.js` and add your keys:**
```javascript
const CONFIG = {
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    geminiApiKey: 'AIzaSy_YOUR_GEMINI_KEY',
    finnhubApiKey: 'your_finnhub_key',
    alphaVantageApiKey: 'YOUR_ALPHA_VANTAGE_KEY',
    // ... rest of config
};
```

**2D: Save `config.js`**

**⚠️ DO NOT commit this file to Git!** It's in `.gitignore` to prevent accidental leaks.

---

### Step 3: Enable Required Google APIs

1. Go to [Google Cloud Console APIs Library](https://console.cloud.google.com/apis/library)
2. Enable these APIs:
   - **Google Drive API**
   - **Generative Language API** (for Gemini)

---

### Step 4: Test Locally

**Using Live Server (VS Code):**
1. Install **Live Server** extension
2. Right-click `index.html` → **"Open with Live Server"**
3. App opens at `http://127.0.0.1:5500`

**Using Python:**
```bash
python3 -m http.server 5500
```

**Visit:** `http://127.0.0.1:5500`

---

### Step 5: Deploy to GitHub Pages (Optional)

**⚠️ WARNING:** Currently, deploying to GitHub Pages requires API keys in `config.js`, which cannot be safely committed. A backend proxy solution is planned. For now, use local development only.
```bash
# DON'T DO THIS YET - API keys would be exposed!
# git add .
# git commit -m "Initial setup"
# git push origin main
```

**Coming Soon:** Cloudflare Workers proxy to enable safe public hosting.

---

## 📖 How It Works

### Architecture
```
Browser (Local Development)
    ↓
JavaScript SPA (Client-Side Only)
    ↓
APIs: Drive + Gemini + Finnhub + Alpha Vantage + frankfurter.app (FX)
```

**No backend servers. No databases. Just your browser + APIs.**

### Multi-Currency System
1. **Transaction Processing:** When PDF processed, fetch ALL FX rates for that date
2. **Historical Rates:** Cost basis calculated using transaction date FX rates (never changes)
3. **Live Rates:** Current portfolio value uses today's FX rates (updates hourly)
4. **Currency Switching:** Overview tab can display in any of 6 currencies
5. **Data Source:** frankfurter.app (European Central Bank) - free, accurate, historical data

**Supported Currencies:** CAD, USD, GBP, EUR, AUD, CHF

### PDF Processing Flow
1. Upload PDF to Google Drive folder
2. App detects new file
3. Extract text (PDF.js) OR OCR image (Gemini Vision)
4. Parse with Gemini AI → Extract transactions
5. **Fetch FX rates** for transaction date (ALL currencies stored)
6. **You review** in validation table (with exchange selection)
7. Accept/reject/edit each transaction
8. Save to database with historical FX rate

### Stock Price Updates
1. Click **"🔄 Refresh Prices & FX"** in Overview tab
2. Fetches live prices:
   - **Finnhub** for US/Canadian stocks
   - **Alpha Vantage** for UK stocks (LSE)
3. Fetches live FX rates from frankfurter.app
4. Prices cached for 15 minutes, FX cached for 1 hour
5. Shows real P/L, ARR, and portfolio value

### Data Storage
- **Location:** `/StockTracker/stock-tracker-database.json` in your Google Drive
- **Format:** JSON with FX rates embedded
- **FX Data:** Historical rates stored per transaction date
- **Backup:** Automatically synced by Google Drive
- **Access:** Only you (via OAuth)

---

## 🔒 Security & Privacy

### What's Secure
✅ OAuth 2.0 authentication (industry standard)  
✅ Data in YOUR Google Drive (you control it)  
✅ API keys restricted to your domain (HTTP referrer)  
✅ API keys NOT in Git repository (`.gitignore` protection)  
✅ HTTPS encryption (automatic on GitHub Pages)  
✅ No third-party tracking or analytics  
✅ Client-side only (no servers to hack)  
✅ FX rates from trusted source (European Central Bank)

### What You Should Know
⚠️ API keys stored in local `config.js` (not committed to Git)  
⚠️ Browser-based (clear cache = clear session)  
⚠️ Free tier API limits (60 Finnhub/min, 25 Alpha Vantage/day, unlimited FX)  
⚠️ Cannot currently deploy safely to GitHub Pages (backend proxy needed)

### Best Practices
- Never commit `config.js` with real API keys
- Use a private GitHub repo if concerned about code visibility
- Restrict all API keys to your specific domains
- Enable 2FA on Google account
- Regular Drive backups

### If API Keys Leak
1. **Immediately delete** the leaked key in respective service
2. **Create a new key** and restrict it
3. **Update local `config.js`** (don't commit)
4. **Remove from Git history:**
```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch config.js" \
   --prune-empty --tag-name-filter cat -- --all
```

---

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)  
**Libraries:** PDF.js (Mozilla)  
**APIs:** 
- Google Drive API (storage)
- Google Gemini API (AI parsing)
- Google OAuth 2.0 (authentication)
- Finnhub API (US/CA stock prices)
- Alpha Vantage API (UK stock prices)
- frankfurter.app (FX rates - European Central Bank)

**Hosting:** GitHub Pages (local development for now)  
**Storage:** JSON in Google Drive  

**No frameworks. No build tools. No backend.**

---

## 📂 Project Structure
```
/StockTracker
├── index.html              # App shell
├── config.js               # API keys & settings (NOT in Git - see config.example.js)
├── config.example.js       # Template for config.js
├── .gitignore              # Prevents committing secrets
├── css/
│   └── styles.css          # Global styles
├── /modules                # Core logic
│   ├── auth.js            # OAuth
│   ├── database.js        # Data management
│   ├── drive.js           # Drive integration
│   ├── parser.js          # AI PDF parsing (with FX fetching)
│   ├── portfolio.js       # Analytics (multi-currency)
│   ├── prices.js          # Stock price fetching (Finnhub + Alpha Vantage)
│   ├── fx.js              # FX rate management (frankfurter.app)
│   ├── currency.js        # Currency utilities
│   └── ui.js              # UI rendering
├── README.md              # This file
├── ARCHITECTURE.md        # Technical details
└── BACKLOG.md            # Feature roadmap
```

---

## 🐛 Known Issues

- **Cannot deploy to GitHub Pages** (API keys would be exposed - backend proxy solution needed)
- FX rates: INR not supported by frankfurter.app (warning shown if attempted)
- Batch processing not implemented
- Transaction editing not implemented
- Mobile UI needs polish
- No offline support

See [BACKLOG.md](BACKLOG.md) for full list.

---

## 🗺️ Roadmap

### v1.1 (Completed)
- [x] Real stock price API integration (Finnhub + Alpha Vantage)
- [x] Exchange support (LSE, TSX, NYSE, etc.)
- [x] FX rate API integration (frankfurter.app)
- [x] Multi-currency portfolio calculations
- [x] Currency switcher in Overview

### v1.2 (In Progress)
- [ ] Backend proxy (Cloudflare Workers) for safe hosting
- [ ] Batch PDF processing
- [ ] Transaction editing
- [ ] UI redesign

### v2.0 (Planned)
- [ ] Performance charts
- [ ] Tax reporting
- [ ] Mobile app (PWA)

---

## 🤝 Contributing

This is a personal project, but contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

**Note:** Never commit API keys! Always use `config.example.js` as a template.

---

## 📄 License

MIT License - feel free to use, modify, and share.

---

## 🙏 Acknowledgments

- **Google Gemini** - AI-powered OCR and parsing
- **Finnhub** - Real-time US/Canadian stock prices
- **Alpha Vantage** - UK stock prices (LSE)
- **frankfurter.app** - European Central Bank FX rates (historical & current)
- **PDF.js (Mozilla)** - Client-side PDF rendering
- **Google Drive API** - Serverless database storage

---

## 📧 Contact

Built by Kenneth Ingram  
Questions? Open an issue on GitHub.

---

**⭐ Star this repo if you find it useful!**