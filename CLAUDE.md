# Stock Tracker — Project Context

## What This Is

A personal stock portfolio tracker. Client-side SPA (single-page app), no backend, no framework, no build tools. Runs directly in the browser.

## Tech Stack

- **Language:** Vanilla JavaScript ES6+ (no React, Vue, etc.)
- **Storage:** JSON file in the user's own Google Drive
- **Auth:** Google OAuth 2.0
- **AI Parsing:** Google Gemini Vision/Text (PDF contract notes)
- **Stock Prices:** Finnhub (US/CA) + Alpha Vantage (UK/LSE)
- **FX Rates:** frankfurter.app (European Central Bank, free, no key)
- **Styling:** Custom dark theme CSS, no CSS framework

## Module Structure

| File | Purpose |
|---|---|
| [modules/ui.js](modules/ui.js) | All UI rendering and event handling |
| [modules/parser.js](modules/parser.js) | PDF processing and AI-powered transaction extraction |
| [modules/portfolio.js](modules/portfolio.js) | Holdings, P&L, and ARR calculations |
| [modules/database.js](modules/database.js) | Google Drive CRUD (read/write JSON database) |
| [modules/fx.js](modules/fx.js) | Historical and live FX rate management |
| [modules/prices.js](modules/prices.js) | Multi-source stock price fetching |
| [modules/drive.js](modules/drive.js) | Google Drive folder/file management |
| [modules/auth.js](modules/auth.js) | OAuth flow and token management |
| [modules/currency.js](modules/currency.js) | Currency formatting utilities |

## Key Conventions

- **No build step.** Files are loaded directly via `<script>` tags in [index.html](index.html). No webpack, no bundler.
- **API keys** live in `config.js` (not committed to Git). Template at [config.example.js](config.example.js).
- **Database** is a single JSON file on the user's Google Drive: `/StockTracker/stock-tracker-database.json`.
- **FX rates:** Historical rates are fetched and stored at transaction time (cost basis is locked). Live rates are cached for 1 hour.
- **Price cache:** 15 minutes.
- **Supported currencies:** CAD, USD, GBP, GBX, EUR, AUD, CHF. GBX (British Pence) is display-only — never used for FX or ACB calculations. INR not supported (frankfurter.app limitation).
- **Currency fields per transaction:** `currency` (settlement — drives ACB/FX), `priceCurrency` (price per share display only), `feesCurrency` (fees display only). All calculations use `currency` only.

## Data Shape (simplified)

```js
{
  accounts: {},           // Trading accounts keyed by ID
  transactions: [],       // All buy/sell transactions
  processedFiles: [],     // PDFs already imported
  favorites: {},          // Saved filter presets
  fxRates: {},           // Historical FX rates keyed by date
  settings: {}           // User preferences
}
```

## Current Status (February 2026)

Complete and working for personal use:
- Multi-currency FX system (historical + live)
- PDF contract note import (AI-powered)
- Portfolio dashboard, holdings, transactions, accounts views

**Open items (from [BACKLOG.md](BACKLOG.md)):**
1. Batch PDF processing
2. Portfolio charts and analytics
3. INR currency support
