# Feature Backlog

Priority levels: 🔴 High | 🟡 Medium | 🟢 Low

---

## ✅ Completed Features

### Backend Proxy (Cloudflare Pages Functions) ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- Cloudflare Pages Functions proxy for Gemini and stock price APIs
- API keys stored server-side in environment variables (never exposed to browser)
- Deployed to Cloudflare Pages — publicly accessible
- `config.js` committed safely (no secrets), `config.local.js` gitignored for local dev

---

### Profile Icon + StockTracker Logo ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- Bespoke SVG logo: ascending line chart (teal on dark background) + "ST" monospace text
- Profile avatar button in navbar (shows user initials from Google account)
- Profile dropdown: user name, email, Admin Settings link, Sign Out
- Mobile: profile icon + hamburger both visible top-right (hamburger rightmost)
- Logo displayed in navbar, mobile sidebar, and login screen

---

### Admin Page ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- Admin page with 5 sections: Contract Notes Folder, Reporting Currency, Price Data, Export Data, Danger Zone
- Reporting currency change with localStorage persistence
- Price cache controls (clear cache, view AV call counter)
- JSON database backup download
- Clear All Data (double confirmation)
- Folder configuration moved from Sync page to Admin

---

### Transaction Editing ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- Edit button on transaction rows (replaces delete-only)
- Full edit modal with all fields (symbol, exchange, type, date, quantity, price, currency, fees, account, broker, notes)
- Save, Cancel, Delete actions in modal footer
- Delete requires secondary confirmation before executing
- Changes saved to Drive immediately

---

### Price Currency & Fees Currency Fields ✅
**Status:** Complete (v1.3)
**Completed:** February 2026

**What was delivered:**
- `priceCurrency` field on each transaction — the currency the price per share is quoted in (e.g. GBX for LSE pence-quoted stocks)
- `feesCurrency` field on each transaction — the currency of commission/fees
- Both fields auto-populated by Gemini from exchange context and contract note
- User-editable dropdowns in Review & Validate modal (after Price and Fees columns)
- Displayed correctly in Transaction view (price shows in priceCurrency, fees in feesCurrency)
- Edit transaction modal includes priceCurrency and feesCurrency selects
- GBX (British Pence) added to supported display currencies with `p` symbol
- Falls back to settlement currency for existing transactions that predate this feature

---

### Data Export ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- CSV export on Transactions page (respects active filters)
- JSON database backup on Admin page
- All fields included in CSV export

---

### Mobile Navigation ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- Hamburger button (top-right on mobile)
- Slide-in sidebar with all nav links + user email + sign out
- Desktop pill tabs unchanged
- Sidebar closes on overlay click, link click, or close button

---

### Performance Optimisations ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- Portfolio stats cache — tab switching is instant after first load
- Cache invalidated only when prices refresh or transactions change
- Shared filter state across Overview and Transactions
- Auto-scan on Sync tab (throttled 60s, no manual scan needed)

---

### Settings / Shared Filters ✅
**Status:** Complete (v1.2)
**Completed:** February 2026

**What was delivered:**
- Filters persist across Overview and Transactions tabs
- Green dot (🟢) prefix on Account Holders filter options
- Base currency setting moved to Admin page with localStorage persistence
- Saved filter favorites work with shared filter state

---

### Multi-Currency FX System ✅
**Status:** Complete (v1.1)
**Completed:** February 2026

**What was delivered:**
- Live & historical FX rates from frankfurter.app (European Central Bank)
- Support for 6 currencies: CAD, USD, GBP, EUR, AUD, CHF
- Automatic FX rate fetching when processing transactions
- Historical cost basis using transaction date FX rates
- Currency switcher in Overview tab
- Accurate P/L and ARR calculations across currencies
- Holdings display with native price + converted values

---

### Real Stock Prices ✅
**Status:** Complete (v1.4)
**Completed:** February 2026

**What was delivered:**
- Yahoo Finance (unofficial API — free, no key, all exchanges)
- Auto-refresh mechanism (manual button)
- Price caching (15 minutes) + last known price fallback (localStorage + Drive)
- Exchange support: LSE (`.L`), TSX (`.TO`), ASX (`.AX`), XETRA (`.DE`), NYSE, NASDAQ
- Class-share dot→hyphen conversion (BRK.B → BRK-B)
- GBp (pence) → GBP conversion (LSE prices)
- Cloudflare proxy routes all requests to avoid CORS; local dev also uses proxy
- Graceful error handling — always falls back to last known price

---

### Batch PDF Processing ✅
**Status:** Complete (v1.5)
**Completed:** February 2026

**What was delivered:**
- Functional "Process All" button on Import tab
- Queue system processes files sequentially
- Progress indicator (X of Y processed)
- Error handling — continues on failure, reports errors at end
- Summary report after completion

---

## 🟡 Medium Priority

### Portfolio Charts & Analytics
**Status:** Basic stats only
**Effort:** 3-4 hours
**Value:** Visual insights

**Scope:**
- Performance over time (line chart)
- Sector allocation (pie chart)
- Asset allocation by currency
- P/L breakdown by holding
- Chart.js or similar library

---

### Contract Note File Management
**Status:** Files tracked, no UI
**Effort:** 1-2 hours
**Value:** Manage processed files

**Scope:**
- View list of processed files
- Unmark as processed (re-process)
- Link transactions to source file
- Delete processing history

---

### Data Validation
**Status:** Minimal
**Effort:** 2 hours
**Value:** Data quality

**Scope:**
- Duplicate detection
- Flag suspicious data (price=$0, qty=0)
- Validate account matching
- Warn on manual vs AI-parsed

---

## 🟢 Low Priority

### Performance Tracking
**Status:** ARR calculated
**Effort:** 2-3 hours
**Value:** Long-term insights

**Scope:**
- Daily/weekly/monthly performance charts
- Benchmark comparison (S&P 500, TSX)
- Dividend tracking
- Time-weighted vs money-weighted returns

---

### Advanced Filtering
**Status:** Basic filters
**Effort:** 1-2 hours
**Value:** Better data exploration

**Scope:**
- Search by symbol, date range, amount
- Filter by broker, account type
- Complex AND/OR filters
- Quick filters (this month, this year, etc.)

---

### INR Currency Support
**Status:** Not supported
**Effort:** 2-3 hours
**Dependencies:** New FX API (frankfurter doesn't have INR)
**Value:** Support Indian market transactions

**Options:**
- Add secondary FX API (exchangerate-api.com) for INR only
- Manual INR rate entry with UI support

**Current Workaround:**
- UI shows warning when INR detected
- User must enter manual FX rate

---

### Offline Mode (PWA)
**Status:** None
**Effort:** 2-3 hours
**Value:** Access anywhere

**Scope:**
- Service worker
- Cache portfolio data
- Queue actions when offline
- Install as app prompt

---

## 🔵 Technical Debt

### Code Cleanup
**Effort:** 2-3 hours

- Remove verbose console.logs
- Add JSDoc comments
- Refactor duplicate code
- Consistent naming conventions
- Split large functions

---

### Security Enhancements
**Effort:** 1-2 hours

- Add Content Security Policy
- Subresource Integrity for CDNs
- Session timeout improvements
- Input sanitization review

---

### Testing
**Effort:** 3-4 hours

- Unit tests for calculations (P/L, ARR, FX conversions)
- Edge case testing
- Browser compatibility
- Mobile device testing
- Automated regression tests

---

## 💡 Future Ideas (Not Prioritised)

- AI-powered portfolio insights ("You should consider selling AAPL based on...")
- Tax-loss harvesting suggestions
- Broker API integrations (auto-import transactions)
- Notifications/alerts (price targets, rebalancing)
- Watchlist feature
- Recurring investment tracking
- Portfolio rebalancing recommendations
- Benchmark comparison tracking
- Light mode theme option

---

## Upcoming

**Next:**
- Portfolio charts and analytics

**Later:**
- Advanced filtering
- Performance tracking charts

---

**Last Updated:** February 24, 2026
