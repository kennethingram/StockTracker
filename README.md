# StockTracker — Portfolio Management

AI-powered portfolio tracker with automated contract note processing. Built for personal use, designed for privacy.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://stock-tracker.pages.dev)
[![Cloudflare Pages](https://img.shields.io/badge/hosted-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)

---

## Features

### Current (v1.2)
- **AI-Powered PDF Parsing** — Google Gemini Vision OCR for scanned contract notes
- **Google Drive Storage** — Your data stays in YOUR Drive
- **OAuth Authentication** — Secure Google sign-in
- **Multi-Currency Support** — Track stocks in USD, CAD, GBP, EUR, AUD, CHF (6 currencies)
- **Live FX Rates** — True historical & current rates from frankfurter.app (European Central Bank)
- **Portfolio Analytics** — Holdings, P/L, ARR calculations with multi-currency support
- **Real-Time Stock Prices** — Hybrid API (Finnhub for US/CA, Alpha Vantage for UK)
- **Exchange Support** — LSE, TSX, NYSE, NASDAQ, and more
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
- Benchmark comparison

---

## Quick Start

### For Users

1. **Visit:** [https://stock-tracker.pages.dev](https://stock-tracker.pages.dev)
2. **Sign in** with your Google account
3. **Create an account** in the Accounts tab
4. **Configure your Contract Notes folder** in the Admin tab
5. **Upload contract notes** to your Google Drive folder
6. **Process them** in the Import tab
7. **View your portfolio** in Overview / Holdings / Transactions

No API keys needed — all API calls are proxied through Cloudflare Pages Functions.

---

## Setup Instructions (For Developers)

### Prerequisites

You'll need API keys (all free):
1. **Google OAuth Client ID** — For Google sign-in
2. **Google Gemini API Key** — For AI PDF parsing
3. **Finnhub API Key** — For US/Canadian stock prices
4. **Alpha Vantage API Key** — For UK stock prices

**Note:** FX rates are fetched from frankfurter.app (European Central Bank) — no API key needed.

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
const CONFIG_LOCAL = {
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    geminiApiKey: 'AIzaSy_YOUR_GEMINI_KEY',
    finnhubApiKey: 'your_finnhub_key',
    alphaVantageApiKey: 'YOUR_ALPHA_VANTAGE_KEY',
};
```

`config.local.js` is gitignored — never committed.

**2C: Get your API keys:**

#### Google OAuth Client ID:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new project or select existing
3. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
4. Application type: **Web application**
5. Add authorized JavaScript origins: `https://stock-tracker.pages.dev`, `http://127.0.0.1:5500`
6. Copy the **Client ID**

#### Google Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Set HTTP referrer restriction to your domain

#### Finnhub API Key:
1. Go to [Finnhub](https://finnhub.io/register)
2. Sign up for **Free plan** (60 API calls/minute)

#### Alpha Vantage API Key:
1. Go to [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Get free API key (25 calls/day for UK stocks)

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
   - `FINNHUB_API_KEY`
   - `ALPHA_VANTAGE_API_KEY`
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
APIs: Drive + Gemini (via proxy) + Finnhub (via proxy) + Alpha Vantage (via proxy) + frankfurter.app (FX, direct)
```

### Multi-Currency System
1. **Transaction Processing:** When PDF processed, fetch ALL FX rates for that date
2. **Historical Rates:** Cost basis calculated using transaction date FX rates (never changes)
3. **Live Rates:** Current portfolio value uses today's FX rates (updates hourly)
4. **Currency Switching:** Overview tab can display in any of 6 currencies
5. **Data Source:** frankfurter.app (European Central Bank) — free, accurate, historical data

**Supported Currencies:** CAD, USD, GBP, EUR, AUD, CHF

### PDF Processing Flow
1. Upload PDF to Google Drive folder
2. App detects new file (auto-scans on Import tab visit)
3. Extract text (PDF.js) OR OCR image (Gemini Vision)
4. Parse with Gemini AI → Extract transactions
5. **Fetch FX rates** for transaction date (ALL currencies stored)
6. **You review** in validation table (with exchange selection)
7. Accept/reject/edit each transaction
8. Save to database with historical FX rate

### Stock Price Updates
1. Click **"Refresh Prices & FX"** in Overview tab
2. Fetches live prices: **Finnhub** for US/Canadian, **Alpha Vantage** for UK (LSE)
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
- Free tier API limits apply (60 Finnhub/min, 25 Alpha Vantage/day)

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
- Finnhub API (US/CA stock prices, via proxy)
- Alpha Vantage API (UK stock prices, via proxy)
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
│   ├── prices.js          # Stock price fetching (Finnhub + Alpha Vantage)
│   ├── fx.js              # FX rate management (frankfurter.app)
│   ├── currency.js        # Currency utilities
│   └── ui.js              # UI rendering + navigation + admin
├── functions/
│   └── api/
│       ├── gemini.js      # Cloudflare Function: Gemini proxy
│       └── prices.js      # Cloudflare Function: price API proxy
├── README.md
├── ARCHITECTURE.md
└── BACKLOG.md
```

---

## Roadmap

### v1.2 (Current)
- [x] Cloudflare Pages Functions proxy (safe public hosting)
- [x] StockTracker SVG logo
- [x] Profile icon with dropdown (initials, email, admin link, sign out)
- [x] Admin page (folder, currency, cache, export, danger zone)
- [x] Transaction editing (all fields, delete with confirmation)
- [x] CSV export on Transactions page
- [x] Mobile hamburger sidebar navigation
- [x] Portfolio stats cache (instant tab switching)
- [x] Shared filter state across tabs
- [x] Auto-scan on Import tab

### v1.3 (Next)
- [ ] Batch PDF processing
- [ ] Portfolio performance charts

### v2.0 (Planned)
- [ ] PWA / offline support
- [ ] Tax reporting
- [ ] Broker API integrations

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
- **Finnhub** — Real-time US/Canadian stock prices
- **Alpha Vantage** — UK stock prices (LSE)
- **frankfurter.app** — European Central Bank FX rates
- **PDF.js (Mozilla)** — Client-side PDF rendering
- **Google Drive API** — Serverless database storage
- **Cloudflare Pages** — Hosting + serverless API proxy

---

Built by Kenneth Ingram
Questions? Open an issue on GitHub.

**Star this repo if you find it useful!**
