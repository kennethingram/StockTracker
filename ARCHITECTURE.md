# Stock Portfolio Tracker — Architecture

**Last Updated:** February 23, 2026

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                             │
│                  (Browser: Desktop, Mobile, Tablet)              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│             CLOUDFLARE PAGES (Static + Functions)                │
│                  https://stock-tracker.pages.dev                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    CLIENT-SIDE APP (SPA)                    │ │
│  │                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │ │
│  │  │  UI Layer   │  │  Business   │  │   Data Layer     │  │ │
│  │  │             │  │  Logic      │  │                  │  │ │
│  │  │ - Navbar    │  │ - Portfolio │  │ - Database       │  │ │
│  │  │ - Profile   │  │ - Currency  │  │ - Drive          │  │ │
│  │  │ - Views     │  │ - Prices    │  │ - Auth           │  │ │
│  │  │ - Modals    │  │ - Parser    │  │ - FX             │  │ │
│  │  │ - Admin     │  │ - Stats cache│  │                 │  │ │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              CLOUDFLARE PAGES FUNCTIONS (Proxy)             │ │
│  │                                                            │ │
│  │   /api/gemini   →  Google Gemini API  (AI parsing)         │ │
│  │   /api/prices   →  Finnhub / Alpha Vantage  (prices)       │ │
│  │                                                            │ │
│  │   API keys stored in Cloudflare env vars (server-side)     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┬──────────────────┐
            │                │                │                  │
            ▼                ▼                ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐
│  GOOGLE DRIVE   │ │  GOOGLE GEMINI  │ │ GOOGLE OAUTH │ │ FRANKFURTER    │
│  API            │ │  API            │ │              │ │ .APP (ECB)     │
│                 │ │  (via proxy)    │ │              │ │                │
│ - Database JSON │ │ - PDF OCR       │ │ - Auth       │ │ - Historical   │
│ - File Storage  │ │ - Vision AI     │ │              │ │   FX rates     │
│ - Contract Notes│ │ - Text Extract  │ │              │ │ - Live FX rates│
└─────────────────┘ └─────────────────┘ └──────────────┘ └────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌──────────────────────┐        ┌──────────────────────┐
│ FINNHUB API          │        │ ALPHA VANTAGE API     │
│ (via proxy)          │        │ (via proxy)           │
│                      │        │                      │
│ - US/CA stock prices │        │ - UK stock prices     │
│ - 60 calls/min free  │        │ - LSE stocks          │
│                      │        │ - 25 calls/day free   │
└──────────────────────┘        └──────────────────────┘
```

---

## Tech Stack

### Frontend
- **HTML5** — Structure
- **CSS3** — Styling (custom dark theme, teal accent, no frameworks)
- **Vanilla JavaScript** — All logic (ES6+, modular object pattern)
- **PDF.js** — Client-side PDF text extraction
- **No build tools** — Direct deployment

### Hosting & Proxy
- **Cloudflare Pages** — Static file hosting
- **Cloudflare Pages Functions** — Serverless proxy for API keys
  - `/functions/api/gemini.js` — Proxies Gemini API calls
  - `/functions/api/prices.js` — Proxies Finnhub + Alpha Vantage calls
  - Environment variables store secrets server-side (never exposed to browser)

### External APIs
- **Google Drive API** — Database storage (JSON file in user's Drive)
- **Google Gemini API** — AI-powered PDF parsing (Vision + Text)
- **Google OAuth 2.0** — Authentication
- **Finnhub API** — US/Canadian stock prices (via Cloudflare proxy)
- **Alpha Vantage API** — UK stock prices / LSE (via Cloudflare proxy)
- **frankfurter.app** — FX rates (European Central Bank, called directly — no key needed)

---

## Module Architecture

```
/StockTracker
│
├── index.html                 # Main application shell
├── config.js                  # Public configuration (committed, no secrets)
├── config.local.js            # Local dev secrets — NOT in Git (.gitignore)
├── config.example.js          # Template for config.local.js
├── .gitignore
├── css/
│   └── styles.css             # Global styles (dark theme)
│
├── modules/                   # Core business logic
│   ├── auth.js               # Google OAuth + profile info population
│   ├── database.js           # Drive storage & data management
│   ├── drive.js              # Drive API integration
│   ├── parser.js             # AI-powered PDF parsing (Gemini) + FX fetching
│   ├── portfolio.js          # Portfolio calculations & analytics (multi-currency)
│   ├── prices.js             # Stock price management (Finnhub + Alpha Vantage)
│   ├── fx.js                 # FX rate management (frankfurter.app)
│   ├── currency.js           # Currency utilities
│   └── ui.js                 # UI rendering, navigation, profile, admin, CSV export
│
├── functions/
│   └── api/
│       ├── gemini.js         # Cloudflare Function: Gemini AI proxy
│       └── prices.js         # Cloudflare Function: Finnhub + Alpha Vantage proxy
│
├── README.md
├── ARCHITECTURE.md            # This file
└── BACKLOG.md                # Feature roadmap
```

---

## Data Storage

### Database Schema
```javascript
{
  accounts: {
    "accountId": {
      name: "Trading Account",
      broker: "TD Direct",
      holders: ["Kenneth", "Jane"],
      currency: "CAD"
    }
  },
  transactions: [
    {
      id: "uuid",
      symbol: "LGEN",
      exchange: "LSE",
      type: "BUY",
      date: "2025-09-03",
      quantity: 9000,
      price: 2.33,
      priceCurrency: "GBX",   // currency of price per share (display only; may differ from settlement)
      currency: "GBP",        // settlement currency — drives ACB and FX conversion
      fees: 12.50,
      feesCurrency: "GBP",    // currency of commission/fees (display only)
      total: 21071.91,
      accountId: "accountId",
      broker: "Hargreaves Lansdown",
      totalInBase: 39002.27,    // CAD, historical FX — NEVER CHANGES
      priceInBase: 4.33,        // CAD, historical FX
      feesInBase: 23.15,        // CAD, historical FX
      fxDate: "2025-09-03"      // Which FX snapshot was used
    }
  ],
  processedFiles: ["file_id_1", "file_id_2"],
  favorites: {
    "My View": { accounts: ["id1"], holders: ["Kenneth"] }
  },
  settings: {
    baseCurrency: "CAD",
    createdAt: "...",
    contractNotesFolderId: "..."
  },
  fxRates: {
    "2025-09-03": {
      base: "USD",
      rates: { USD: 1.0, CAD: 1.3559, GBP: 0.7941, EUR: 1.0724, AUD: 1.5283, CHF: 0.9124 },
      date: "2025-09-03",
      fetchedAt: "2026-02-22T..."
    },
    "live": {
      base: "USD",
      rates: { ... },
      cachedUntil: "2026-02-22T..."
    }
  }
}
```

**Storage location:** `/StockTracker/stock-tracker-database.json` in user's Google Drive.

---

## Key Data Flows

### 1. Authentication Flow
```
User → Click "Sign In" → Google OAuth Consent →
Token Received → Database.init() → Load JSON from Drive →
App Ready → Profile avatar shows initials
```

### 2. Contract Note Processing Flow
```
Import tab visited →
Auto-scan triggers (throttled 60s) → Drive.scanFolder() →
Shows unprocessed files →
User clicks "Process" →

[Text PDF]   PDF.js extracts text → Gemini Text API (via CF proxy)
[Image PDF]  Convert to base64 → Gemini Vision API (via CF proxy)

→ Validation Modal (human-in-the-loop) →
User reviews/edits fields including exchange →
User accepts →

[FX Rate Fetching]
  1. Extract transaction date
  2. FX.fetchAllRatesForDate(date)
  3. Fetch from frankfurter.app — ALL 6 currencies
  4. Store in database.fxRates[date]
  5. Calculate totalInBase, priceInBase, feesInBase

→ Transaction saved → File marked processed → Sync to Drive
```

### 3. Portfolio Calculation Flow (with cache)
```
Tab switch to Overview / Holdings →

[Cache hit?]
  Yes → Return cached stats instantly (no API calls)
  No  →
    Load transactions → Filter by shared activeFilters →
    Group by symbol → Calculate positions →
    Fetch current prices (Finnhub/AV via CF proxy) →
    Convert to base currency (live FX) →
    Calculate P/L, ARR →
    Store in _statsCache →

→ Render to UI

[Cache invalidation]
  Triggered by: price refresh, transaction save, transaction delete
```

### 4. FX Rate Management
```
[Historical FX — Transaction Processing]
  Source: frankfurter.app/{date}?from=USD
  Data:   ALL 6 currencies for that date
  Store:  database.fxRates[date]
  Usage:  Calculate totalInBase (cost basis) — NEVER CHANGES

[Live FX — Portfolio Valuation]
  Source: frankfurter.app/latest?from=USD
  Cache:  1 hour TTL
  Store:  database.fxRates.live
  Usage:  Convert current prices to selected/base currency
```

---

## Performance Architecture

### Portfolio Stats Cache
```javascript
// UI object cache fields
_statsCache: null,
_statsCacheKey: null,
_statsCacheVersion: 0,

// Cache key = version + transaction count + currency
// Invalidated on: price refresh, transaction save/delete
_getStats: async function(filteredData, baseCurrency) {
    const key = `${this._statsCacheVersion}|${filteredData.transactions.length}|${baseCurrency}`;
    if (this._statsCache && this._statsCacheKey === key) return this._statsCache;
    const stats = await Portfolio.calculatePortfolioStats(filteredData, baseCurrency);
    this._statsCache = stats; this._statsCacheKey = key;
    return stats;
},
```
First tab switch: ~2-5s (API calls). Subsequent: instant.

### Shared Filter State
```javascript
// Single shared object — not per-view
activeFilters: { accounts: [], holders: [] }
// Applied identically across Overview, Holdings, Transactions
```

### Price Caching
- In-memory: 15 min TTL
- localStorage fallback: last known price per symbol (persists across sessions)
- Failed fetch cache: 5 min suppression (prevents hammering on API errors)
- Alpha Vantage daily counter persisted in localStorage (survives page reload)

---

## Navigation & UI Architecture

### Desktop Layout
```
┌───────────────────────────────────────────────────────┐
│  [Logo] StockTracker  │ Ov. Hold. Txn. Acc. Imp. Admin │ [Avatar ▾] │
└───────────────────────────────────────────────────────┘
```
- Pill tab navigation (Gmail style)
- Profile avatar (initials) with dropdown: name/email, Admin Settings, Sign Out

### Mobile Layout (< 768px)
```
┌───────────────────────────────┐
│  [Logo]          [Avatar] [☰] │
└───────────────────────────────┘
```
- Pill tabs hidden; hamburger shows slide-in sidebar
- Sidebar: all nav links + user email + sign out
- Profile dropdown also works on mobile

### Profile Dropdown
```javascript
// UI methods
toggleProfileMenu()   // Toggle open/close, sets aria-expanded
closeProfileMenu()    // Close only

// Wired in setupNavigation():
// - Avatar button click → toggleProfileMenu
// - Profile sign-out → closeProfileMenu + Auth.signOut
// - Outside click (document listener) → closeProfileMenu
```

---

## Security Model

### API Key Protection
- **Gemini, Finnhub, Alpha Vantage:** Stored in Cloudflare environment variables
- Frontend calls `/api/gemini` and `/api/prices` (Cloudflare Functions)
- Functions inject API keys server-side; browser never sees them
- **Google OAuth:** Restricted redirect URLs
- **frankfurter.app:** No key needed (public ECB data)
- **Data:** Stored in user's own Google Drive (not on servers)

### Authentication
- OAuth 2.0 token-based flow
- Token stored in `localStorage` (persists across sessions)
- Scopes: `drive.file` (limited to app-created files)
- Sign out clears localStorage token

### Data Privacy
- All processing client-side (browser)
- No backend database — user's Drive is the store
- No data collection or tracking
- User controls all data (delete from Admin page)

---

## API Rate Limits & Caching Strategy

| API | Limit | Cache TTL | Fallback |
|---|---|---|---|
| Gemini | 100/hour | N/A (one-shot per PDF) | Show error |
| Finnhub | 60/minute | 15 min | Last known price (localStorage) |
| Alpha Vantage | 25/day | 15 min | Last known price (localStorage) |
| frankfurter.app | Unlimited | Historical: permanent; Live: 1 hour | Stale rate shown |

---

## Multi-Currency Architecture

### FX Rate Design (USD-base)
All rates stored relative to USD. Cross-currency conversion:
```javascript
// GBP → CAD
amountInUSD = amount / rates.GBP;   // GBP to USD
result = amountInUSD * rates.CAD;   // USD to CAD
```

### Holdings Display Example
```
LGEN (Legal & General Group)  [LSE]
├─ Current Price: £2.753 GBP (C$5.07 CAD)  ← native + live FX converted
├─ Quantity: 9,000 shares
├─ Current Value: C$45,659.51                ← live FX
├─ Cost Basis: C$39,002.27                   ← historical FX (locked in)
├─ ACB: C$4.33/share
├─ P/L: +C$6,657.24 (+17.1%)
└─ ARR: +37.2%
```

---

## Deployment

### Live
**URL:** `https://stock-tracker.pages.dev`
**Host:** Cloudflare Pages
**Proxy:** Cloudflare Pages Functions (`/functions/api/`)
**Deploy:** `git push origin main` → auto-deploy (~1 min)

### Local Development
**URL:** `http://127.0.0.1:5500`
**Method:** Python `python3 -m http.server 5500` or VS Code Live Server
**Config:** `config.local.js` with real API keys (gitignored)
