# Stock Portfolio Tracker - Architecture

## System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                             │
│                  (Browser: Desktop, Mobile, Tablet)              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GITHUB PAGES (Static Host)                     │
│             https://kennethingram.github.io/StockTracker         │
│                    ⚠️ LOCAL DEVELOPMENT ONLY                     │
│              (Backend proxy needed for public hosting)           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE APPLICATION                       │
│                     (Pure JavaScript SPA)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   UI Layer   │  │ Business     │  │ Data Layer   │         │
│  │              │  │ Logic        │  │              │         │
│  │ - Navigation │  │ - Portfolio  │  │ - Database   │         │
│  │ - Views      │  │ - Currency   │  │ - Drive      │         │
│  │ - Forms      │  │ - Prices     │  │ - Auth       │         │
│  │ - Modals     │  │ - Parser     │  │ - FX         │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┬──────────────────┐
            │                │                │                  │
            ▼                ▼                ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌────────────┐
│  GOOGLE DRIVE   │ │  GOOGLE GEMINI  │ │ GOOGLE OAUTH │ │ FINNHUB    │
│  API            │ │  API            │ │              │ │ API        │
│                 │ │                 │ │              │ │            │
│ - Database JSON │ │ - PDF OCR       │ │ - Auth       │ │ - US/CA    │
│ - File Storage  │ │ - Vision AI     │ │ - Auth       │ │   Prices   │
│ - Contract Notes│ │ - Text Extract  │ │              │ │            │
└─────────────────┘ └─────────────────┘ └──────────────┘ └────────────┘
            │                                                │
            ▼                                                ▼
┌─────────────────┐                              ┌─────────────────┐
│ ALPHA VANTAGE   │                              │ FRANKFURTER.APP │
│ API             │                              │ (ECB FX Rates)  │
│                 │                              │                 │
│ - UK Prices     │                              │ - Historical FX │
│ - LSE Stocks    │                              │ - Live FX Rates │
│                 │                              │ - 6 Currencies  │
└─────────────────┘                              └─────────────────┘
```

## Tech Stack

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (custom, no frameworks)
- **Vanilla JavaScript** - All logic (ES6+)
- **PDF.js** - PDF text extraction
- **No build tools** - Direct deployment

### Backend/Services
- **GitHub Pages** - Static hosting (local dev only for now)
- **Google Drive API** - Database storage (JSON file)
- **Google Gemini API** - AI-powered PDF parsing (Vision + Text)
- **Google OAuth 2.0** - Authentication
- **Finnhub API** - US/Canadian stock prices
- **Alpha Vantage API** - UK stock prices (LSE)
- **frankfurter.app** - FX rates (European Central Bank)

### Data Storage
- **Primary:** JSON file in user's Google Drive (`/StockTracker/stock-tracker-database.json`)
- **Structure:**
```javascript
{
  accounts: {},        // Trading accounts
  transactions: [],    // All trades (with totalInBase calculated using historical FX)
  processedFiles: [],  // Tracking processed PDFs
  favorites: {},       // Saved filter combinations
  settings: {          // User preferences
    baseCurrency: "CAD",
    createdAt: "...",
    contractNotesFolderId: "..."
  },
  fxRates: {           // Historical & live FX rates
    "2024-04-25": {
      base: "USD",
      rates: { CAD: 1.3559, GBP: 0.7941, EUR: 1.0724, AUD: 1.5283, CHF: 0.9124 },
      date: "2024-04-25",
      fetchedAt: "2026-02-18T..."
    },
    "live": {
      base: "USD",
      rates: { ... },
      cachedUntil: "..."
    }
  }
}
```

## Module Architecture
```
/StockTracker
│
├── index.html                 # Main application shell
├── config.js                  # Configuration (API keys, settings) - NOT IN GIT
├── config.example.js          # Template for config.js
├── .gitignore                 # Prevents committing secrets
├── css/
│   └── styles.css             # Global styles
│
├── /modules                   # Core business logic
│   ├── auth.js               # Google OAuth authentication
│   ├── database.js           # Drive storage & data management
│   ├── drive.js              # Drive API integration
│   ├── parser.js             # AI-powered PDF parsing (Gemini) + FX fetching
│   ├── portfolio.js          # Portfolio calculations & analytics (multi-currency)
│   ├── prices.js             # Stock price management (Finnhub + Alpha Vantage)
│   ├── fx.js                 # FX rate management (frankfurter.app)
│   ├── currency.js           # Currency utilities
│   └── ui.js                 # UI rendering & event handling
│
├── README.md                 # Documentation
├── ARCHITECTURE.md           # This file
└── BACKLOG.md               # Feature roadmap
```

## Data Flow

### 1. Authentication Flow
```
User → Click "Sign In" → Google OAuth Consent → 
Token Received → Database.init() → Load JSON from Drive → 
App Ready
```

### 2. Contract Note Processing Flow (With FX)
```
User uploads PDF to Drive folder → 
App scans folder → Shows unprocessed files → 
User clicks "Process" → 

[Text PDF Path]
  PDF.js extracts text → Gemini Text API → Parse JSON

[Image PDF Path]  
  Convert to base64 → Gemini Vision API → OCR + Parse JSON

→ Validation Modal (human-in-the-loop) →
User reviews/edits → User Accepts → 

[FX Rate Fetching - AUTOMATIC]
  1. Extract transaction date (e.g., "2024-04-25")
  2. Call FX.fetchAllRatesForDate("2024-04-25")
  3. Fetch from frankfurter.app: ALL 6 currencies for that date
  4. Store in database.fxRates["2024-04-25"]
  5. Convert transaction amounts:
     - totalInBase = total × FX rate (transaction date)
     - priceInBase = price × FX rate (transaction date)
     - feesInBase = fees × FX rate (transaction date)

→ Transaction saved with historical cost basis → 
File marked as processed → Sync to Drive
```

### 3. Portfolio Calculation Flow (Multi-Currency)
```
Load transactions from database → 
Group by symbol → Calculate positions → 
Fetch current prices (Finnhub/Alpha Vantage) → 

[Currency Conversion]
  For each holding:
    1. Current price in native currency (e.g., £2.75 GBP)
    2. Convert to base currency using LIVE FX rate (e.g., C$5.07 CAD)
    3. Cost basis already in base currency (historical FX locked in)
    4. Calculate P/L = Current Value (live FX) - Cost Basis (historical FX)
    5. Calculate ARR based on P/L and years held

[Overview Currency Switcher]
  If user selects USD in Overview dropdown:
    1. Convert cost basis: CAD → USD (using live rate)
    2. Current value already converted (live rate)
    3. Recalculate P/L and ARR in USD
    4. Display all KPI cards in USD

→ Render to UI
```

### 4. FX Rate Management
```
[Historical FX - Transaction Processing]
  - Triggered: When transaction saved (after user confirms)
  - Source: frankfurter.app/{date}?from=USD
  - Data: ALL 6 currencies fetched (not just the pair needed)
  - Storage: database.fxRates[date]
  - Usage: Calculate totalInBase (cost basis) - NEVER CHANGES

[Live FX - Portfolio Valuation]
  - Triggered: When prices refreshed, or Overview loaded
  - Source: frankfurter.app/latest?from=USD
  - Cache: 1 hour TTL
  - Storage: database.fxRates.live
  - Usage: Convert current prices to base/selected currency

[Supported Currencies]
  CAD, USD, GBP, EUR, AUD, CHF (6 total)
  Note: INR not supported by frankfurter.app (UI warning shown)
```

## Security Model

### API Key Protection
- **Gemini API Key:** Restricted to GitHub Pages domain via HTTP referrer
- **Finnhub API Key:** Restricted to domain (60 calls/min free tier)
- **Alpha Vantage API Key:** Restricted to domain (25 calls/day free tier)
- **Google OAuth:** Restricted redirect URLs
- **Data:** Stored in user's own Google Drive (not on servers)
- **FX Rates:** No API key needed (frankfurter.app is public)

### Current Limitation
⚠️ **Cannot safely deploy to GitHub Pages** because:
1. API keys must be in `config.js` (client-side code)
2. Committing `config.js` would expose keys publicly
3. Even with domain restrictions, keys visible in browser DevTools

**Solution (Planned):** Cloudflare Workers proxy
- API keys stored in Worker environment variables (server-side)
- Frontend calls Worker → Worker calls Google → Returns response
- Frontend never sees API keys
- Free tier: 100,000 requests/day

### Authentication
- OAuth 2.0 with PKCE flow
- Token stored in sessionStorage (cleared on tab close)
- Scopes: `drive.file` (limited access)

### Data Privacy
- All processing client-side (browser)
- No backend servers (except future proxy for API keys)
- No data collection/tracking
- User controls all data deletion
- FX rates public data (no privacy concerns)

## Current Limitations

1. **Hosting:** Cannot deploy to GitHub Pages safely (API key exposure)
2. **INR Currency:** Not supported by frankfurter.app (manual entry or alternate API needed)
3. **Batch Processing:** UI exists but not functional
4. **Transaction Editing:** Delete only (no edit functionality)
5. **Mobile UI:** Basic responsiveness only
6. **Offline:** No service worker (online only)

## Performance Considerations

### API Rate Limits
- **Gemini:** 100 calls/hour (client-side enforcement)
- **Finnhub:** 60 calls/minute (free tier)
- **Alpha Vantage:** 25 calls/day (free tier for UK stocks)
- **frankfurter.app:** Unlimited (reasonable use)

### Caching Strategy
- **Stock Prices:** 15 minutes TTL
- **Live FX Rates:** 1 hour TTL
- **Historical FX Rates:** Permanent (never expires, stored in database)
- **Database:** All data loaded in memory (works for <10,000 transactions)

### PDF Processing
- **Sequential:** One file at a time
- **Gemini Vision:** ~5 seconds per scanned PDF
- **Gemini Text:** ~2 seconds per text PDF
- **FX Fetch:** ~500ms per unique date (cached after first fetch)

## Multi-Currency Architecture Details

### FX Rate Storage Design
```javascript
fxRates: {
  "2024-04-25": {         // Transaction date
    base: "USD",          // All rates relative to USD
    rates: {
      USD: 1.0,           // 1 USD = 1 USD
      CAD: 1.3559,        // 1 USD = 1.3559 CAD
      GBP: 0.7941,        // 1 USD = 0.7941 GBP
      EUR: 1.0724,
      AUD: 1.5283,
      CHF: 0.9124
    },
    date: "2024-04-25",
    fetchedAt: "2026-02-18T04:09:26.125Z"
  },
  "live": {               // Current rates (cached)
    base: "USD",
    rates: { ... },
    cachedUntil: "2026-02-18T05:09:26.125Z"
  }
}
```

**Why USD base?**
- Universal standard for FX markets
- Allows conversion between ANY currency pair
- Example: GBP → CAD = (GBP/USD) × (USD/CAD)

### Currency Conversion Logic
```javascript
// Historical conversion (cost basis)
function convertHistorical(amount, fromCurrency, toCurrency, date) {
  const rates = database.fxRates[date];
  const amountInUSD = amount / rates.rates[fromCurrency];
  const result = amountInUSD * rates.rates[toCurrency];
  return result;
}

// Live conversion (current value)
function convertLive(amount, fromCurrency, toCurrency) {
  const rates = database.fxRates.live;
  const amountInUSD = amount / rates.rates[fromCurrency];
  const result = amountInUSD * rates.rates[toCurrency];
  return result;
}
```

### Holdings Display Example
```
LGEN (Legal & General Group)
├─ Current Price: £2.753 GBP (C$5.07 CAD) ← Native + Converted (live FX)
├─ Quantity: 9,000 shares
├─ Current Value: C$45,659.51 CAD ← Live FX conversion
├─ Cost Basis: C$39,002.27 CAD ← Historical FX (locked in)
├─ ACB: C$4.33 CAD ← Cost Basis ÷ Quantity
├─ P/L: +C$6,657.24 CAD (+17.1%) ← Current - Cost Basis
└─ ARR: +37.2% ← Annualized return

Calculation:
- Bought 2025-09-03: 9000 × £2.33 = £21,071.91
- Historical FX (2025-09-03): 1 GBP = 1.851 CAD
- Cost Basis: £21,071.91 × 1.851 = C$39,002.27 (NEVER CHANGES)
- Current Price: £2.753 GBP
- Live FX (today): 1 GBP = 1.843 CAD
- Current Value: 9000 × £2.753 × 1.843 = C$45,659.51 (CHANGES DAILY)
- P/L: C$45,659.51 - C$39,002.27 = +C$6,657.24
```

## Deployment

### Current State
**Host:** Local development only  
**URL:** `http://127.0.0.1:5500` (Live Server)  
**Deploy Process:** Not deployed to GitHub Pages (API key security)

### Future State (With Backend Proxy)
**Host:** GitHub Pages  
**URL:** `https://kennethingram.github.io/StockTracker`  
**Proxy:** Cloudflare Workers  
**Deploy Process:** `git push origin main` → Auto-deploy (~2 min)

## Future Architecture Changes

See [BACKLOG.md](BACKLOG.md) for planned features.

**Major architectural changes planned:**
1. **Backend Proxy (HIGH):** Cloudflare Workers for safe API key storage
2. **Batch Processing:** Queue system for multiple PDFs
3. **Transaction Editing:** Edit UI with FX override capability
4. **Client-side caching:** Service worker for offline support
5. **Performance monitoring:** Track API usage and response times

---

**Last Updated:** February 18, 2026