# StockTracker — Portfolio Management

AI-powered portfolio tracker with automated contract note processing. Built for personal use, designed for privacy.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://stocktracker-cit.pages.dev)
[![Cloudflare Pages](https://img.shields.io/badge/hosted-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)

---

## Features

### Current (v1.4)
- **AI-Powered PDF Parsing** — Google Gemini Vision OCR for scanned contract notes
- **Google Drive Storage** — Your data stays in YOUR Drive
- **OAuth Authentication** — Secure Google sign-in
- **Multi-Currency Support** — Track stocks in USD, CAD, GBP, GBX, EUR, AUD, CHF (7 currencies)
- **Live FX Rates** — True historical & current rates from frankfurter.app (European Central Bank)
- **Portfolio Analytics** — Holdings, P/L, ARR calculations with multi-currency support
- **Real-Time Stock Prices** — Yahoo Finance (free, no API key, all exchanges)
- **Exchange Support** — LSE, TSX, ASX, XETRA, NYSE, NASDAQ
- **Historical Cost Basis** — Each buy converted at its own transaction-date FX rate (locked in, never recalculated)
- **Currency Switcher** — View Overview in any supported currency
- **Multi-Account Holder Filtering** — Joint accounts, individual views; filters persist across tabs
- **Human-in-the-Loop Validation** — Review AI extractions before saving
- **Transaction Editing** — Edit any field, or delete with confirmation
- **CSV Export** — Download filtered transactions as CSV from Transactions page
- **Admin Page** — Configure folder, currency, cache, backup, and danger zone
- **Profile Icon + Dropdown** — Initials avatar, name/email display, admin link, sign out
- **StockTracker Logo** — Custom SVG line chart logo
- **Mobile Navigation** — Hamburger sidebar for mobile; pill tabs on desktop
- **Saved Filter Favorites** — Quick access to custom views
- **Responsive Design** — Works on desktop, tablet, phone
- **Secure Public Hosting** — Cloudflare Pages Functions proxy (API keys never in browser)
- **Last Known Price Fallback** — Prices from localStorage shown when API unavailable

### Planned (See [BACKLOG.md](BACKLOG.md))
- Batch PDF processing
- Portfolio performance charts
- INR currency support

---

## Quick Start

### For Users

1. **Visit:** [https://stocktracker-cit.pages.dev](https://stocktracker-cit.pages.dev)
2. **Sign in** with your Google account
3. **Create an account** in the Accounts tab
4. **Configure your Contract Notes folder** in the Admin tab
5. **Upload contract notes** to your Google Drive folder
6. **Process them** in the Import tab
7. **View your portfolio** in Overview / Transactions

No API keys needed — all API calls are proxied through Cloudflare Pages Functions.

---

## Setup Instructions (For Developers)

### Prerequisites

You'll need API keys (all free):
1. **Google OAuth Client ID** — For Google sign-in
2. **Google Gemini API Key** — For AI PDF parsing

**Note:** Stock prices use Yahoo Finance (no key needed). FX rates use frankfurter.app (no key needed).

---

### Step 1: Fork and Clone
```bash
git clone https://github.com/yourusername/StockTracker.git
cd StockTracker
```

---

### Step 2: Configure API Keys

**2A: Copy the config template:**
```bash
cp config.example.js config.local.js
```

**2B: Edit `config.local.js` and add your keys:**
```javascript
CONFIG.googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
CONFIG.geminiApiKey = 'AIzaSy_YOUR_GEMINI_KEY';
```

`config.local.js` is gitignored — never committed.

**2C: Get your API keys:**

#### Google OAuth Client ID:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new project or select existing
3. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
4. Application type: **Web application**
5. Add authorized JavaScript origins: `https://stocktracker-cit.pages.dev`, `http://127.0.0.1:5500`
6. Copy the **Client ID**

#### Google Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Note: free tier is 20 requests/day — upgrade billing for heavy use

---

### Step 3: Test Locally

```bash
python3 -m http.server 5500
```
Visit `http://127.0.0.1:5500`

---

### Step 4: Deploy to Cloudflare Pages

1. Push repo to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Connect your GitHub repository
4. Build settings: **none** (static site)
5. Add environment variables in Cloudflare dashboard:
   - `GEMINI_API_KEY`
6. Deploy — your app is live!

API keys are stored in Cloudflare's environment (server-side). The browser never sees them.

---

## How It Works

### Architecture
```
Browser
    ↓ HTTPS
Cloudflare Pages (static site + Functions proxy)
    ↓
APIs: Drive + Gemini (via proxy) + Yahoo Finance (via proxy, CORS) + frankfurter.app (FX, direct)
```

### Multi-Currency System
1. **Transaction Processing:** When PDF processed, fetch ALL FX rates for that date
2. **Historical Rates:** Cost basis calculated using transaction date FX rates — locked in, never recalculated
3. **Live Rates:** Current portfolio value uses today's FX rates (updates hourly)
4. **Currency Switching:** Overview tab can display in any of 6 currencies
5. **Data Source:** frankfurter.app (European Central Bank) — free, accurate, historical data

**Supported Currencies:** CAD, USD, GBP, GBX (display only), EUR, AUD, CHF

### PDF Processing Flow
1. Upload PDF to Google Drive folder
2. App detects new file (auto-scans on Import tab visit)
3. OCR image with Gemini Vision API
4. Parse with Gemini AI → Extract transactions
5. **Fetch FX rates** for transaction date (ALL currencies stored)
6. **You review** in validation table (with exchange selection)
7. Accept/reject/edit each transaction
8. Save to database with historical FX rate locked in

### Stock Price Updates
1. Click **"Refresh Prices & FX"** in Overview tab
2. Fetches live prices via **Yahoo Finance** (all exchanges — no API key)
3. Fetches live FX rates from frankfurter.app
4. Prices cached for 15 minutes; falls back to last known price on failure
5. Shows real P/L, ARR, and portfolio value

### Data Storage
- **Location:** `/StockTracker/stock-tracker-database.json` in your Google Drive
- **Format:** JSON with FX rates embedded per transaction date
- **Access:** Only you (via OAuth)
- **Backup:** Download JSON from Admin page

---

## Security & Privacy

### What's Secure
- OAuth 2.0 authentication (industry standard)
- Data in YOUR Google Drive (you control it)
- API keys in Cloudflare environment variables (never in browser code)
- API keys NOT in Git repository
- HTTPS encryption (Cloudflare)
- No third-party tracking or analytics
- Client-side only (no backend database)
- FX rates from trusted source (European Central Bank)

### What You Should Know
- `config.local.js` holds local dev keys (gitignored — never committed)
- Browser-based (clear cache = clear session)
- Gemini free tier: 20 requests/day — upgrade billing for production use

---

## Tech Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
**Libraries:** PDF.js (Mozilla)
**Hosting:** Cloudflare Pages (static + Functions)
**Proxy:** Cloudflare Pages Functions (serverless)
**APIs:**
- Google Drive API (storage)
- Google Gemini API (AI parsing, via proxy)
- Google OAuth 2.0 (authentication)
- Yahoo Finance (stock prices — free, no key, via proxy for CORS)
- frankfurter.app (FX rates — European Central Bank, direct)

**No frameworks. No build tools. No backend database.**

---

## Project Structure
```
/StockTracker
├── index.html              # App shell
├── config.js               # Public config (no secrets, in Git)
├── config.local.js         # Local dev secrets (NOT in Git — gitignored)
├── config.example.js       # Template for config.local.js
├── .gitignore
├── css/
│   └── styles.css          # Global styles (dark theme, teal accent)
├── modules/                # Core logic
│   ├── auth.js            # OAuth + profile info
│   ├── database.js        # Data management + Drive sync
│   ├── drive.js           # Drive API integration
│   ├── parser.js          # AI PDF parsing (Gemini) + FX fetching
│   ├── portfolio.js       # Analytics (multi-currency, P/L, ARR)
│   ├── prices.js          # Stock price fetching (Yahoo Finance)
│   ├── fx.js              # FX rate management (frankfurter.app)
│   ├── currency.js        # Currency utilities
│   └── ui.js              # UI rendering + navigation + admin
├── functions/
│   └── api/
│       ├── gemini.js      # Cloudflare Function: Gemini proxy
│       └── prices.js      # Cloudflare Function: Yahoo Finance proxy (CORS)
├── README.md
├── ARCHITECTURE.md
└── BACKLOG.md
```

---

## Roadmap

### v1.4 (Current)
- [x] Yahoo Finance (replaced Finnhub + Alpha Vantage — free, no key, all exchanges)
- [x] Historical cost basis FX (each buy locked at transaction-date rate)
- [x] Holdings merged into Overview tab (8-column table with Cost)
- [x] Price/fees currency fields (`priceCurrency`, `feesCurrency`)
- [x] GBX (British Pence) display support
- [x] Stacked toast notifications
- [x] Styled folder selection modal (replaces browser prompt)
- [x] Confirm dialog z-index fix

### v1.3 (Previous)
- [x] Price/fees currency fields
- [x] GBX support

### v1.2 (Previous)
- [x] Cloudflare Pages Functions proxy (safe public hosting)
- [x] StockTracker SVG logo + profile dropdown
- [x] Admin page
- [x] Transaction editing
- [x] CSV export
- [x] Mobile hamburger sidebar
- [x] Portfolio stats cache

### Next
- [ ] Batch PDF processing
- [ ] Portfolio performance charts

---

## Contributing

This is a personal project, but contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

**Note:** Never commit `config.local.js` with real API keys!

---

## License

MIT License — feel free to use, modify, and share.

---

## Acknowledgments

- **Google Gemini** — AI-powered OCR and parsing
- **Yahoo Finance** — Real-time stock prices (free, all exchanges)
- **frankfurter.app** — European Central Bank FX rates
- **PDF.js (Mozilla)** — Client-side PDF rendering
- **Google Drive API** — Serverless database storage
- **Cloudflare Pages** — Hosting + serverless API proxy

---

Built by Kenneth Ingram
Questions? Open an issue on GitHub.

**Star this repo if you find it useful!**
