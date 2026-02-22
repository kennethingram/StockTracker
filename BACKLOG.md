# Feature Backlog

Priority levels: 🔴 High | 🟡 Medium | 🟢 Low

---

## ✅ Completed Features

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
**Status:** Complete (v1.0)  
**Completed:** February 2026  

**What was delivered:**
- Hybrid API integration (Finnhub for US/CA, Alpha Vantage for UK)
- Auto-refresh mechanism (manual button)
- Price caching (15 minutes)
- Exchange support (LSE, TSX, NYSE, NASDAQ)
- Last updated timestamps
- Graceful error handling

---

## 🔴 High Priority

### Backend Proxy for Hosting
**Status:** Not started  
**Effort:** 2-3 hours  
**Dependencies:** Cloudflare account  
**Value:** Enable safe public hosting without exposing API keys

**Problem:**
- Cannot deploy to GitHub Pages (API keys would be exposed)
- App only works locally with `config.js`
- Can't share working demo with friends

**Solution:**
- Cloudflare Workers proxy for Gemini API
- API keys stored in environment variables
- Frontend calls worker, worker calls Google
- Free tier: 100,000 requests/day

**Scope:**
- Create Cloudflare Worker
- Proxy Gemini API requests
- Update frontend to use worker URL
- Remove API keys from config.js
- Deploy to GitHub Pages
- Add rate limiting (optional)

---

## 🟡 Medium Priority

### UI/UX Redesign
**Status:** ✅ Complete
**Effort:** 3-4 hours
**Dependencies:** None
**Value:** Better daily user experience

**Scope:**
- Dark theme with slate palette + teal accent
- Compact Yahoo Finance-style holding rows
- Gmail-style pill nav tabs
- Green/red P/L and ARR colour coding
- Consistent card design across all pages
- Mobile responsive

---

### Portfolio Charts & Analytics
**Status:** Basic stats only  
**Effort:** 3-4 hours  
**Dependencies:** Real prices (done)  
**Value:** Visual insights

**Scope:**
- Performance over time (line chart)
- Sector allocation (pie chart)
- Asset allocation by currency
- P/L breakdown by holding
- Export charts as images
- Chart.js or similar library

---

### Settings Page
**Status:** None  
**Effort:** 1-2 hours  
**Dependencies:** None  
**Value:** User control

**Scope:**
- Change base currency
- Theme preferences (dark/light mode)
- Clear all data (with confirmation)
- Export/import database JSON
- View API usage stats
- Manage favorites

---

### Data Export
**Status:** None  
**Effort:** 1-2 hours  
**Dependencies:** None  
**Value:** Backup and external analysis

**Scope:**
- Export to CSV (transactions, holdings)
- Export to Excel (multi-sheet)
- Download database JSON backup
- Generate PDF reports
- Email reports (optional)

---

### Contract Note File Management
**Status:** Files tracked, no UI  
**Effort:** 1-2 hours  
**Dependencies:** None  
**Value:** Manage processed files

**Scope:**
- View list of processed files
- Unmark as processed (re-process)
- Link transactions to source file
- Delete processing history
- Search/filter processed files

---

### Data Validation
**Status:** Minimal  
**Effort:** 2 hours  
**Dependencies:** None  
**Value:** Data quality

**Scope:**
- Duplicate detection
- Flag suspicious data (price=$0, qty=0)
- Validate account matching
- Warn on manual vs AI-parsed
- Required field enforcement
- Data consistency checks

---

## 🟢 Low Priority

### Batch PDF Processing
**Status:** UI placeholder exists  
**Effort:** 2-3 hours  
**Dependencies:** None  
**Value:** Process backlog of PDFs quickly

**Scope:**
- Functional "Process All" button
- Queue system for multiple files
- Progress indicator (X of Y processed)
- Error handling (continue on failure)
- Summary report after completion
- Pause/resume capability

---

### Transaction Editing
**Status:** Delete only  
**Effort:** 3-4 hours  
**Dependencies:** None  
**Value:** Fix mistakes without re-processing

**Scope:**
- Edit existing transactions (all fields)
- **Secondary FX rate menu** - Edit historical FX rate for specific transaction
- Account reassignment
- Bulk edit multiple transactions
- Duplicate detection during edit
- Edit history log/audit trail
- Validation on save

**UI Flow:**
1. Click "Edit" on transaction
2. Modal opens with transaction fields
3. "Advanced" section with FX rate override
4. Save triggers recalculation of cost basis

---

### Performance Tracking
**Status:** ARR calculated  
**Effort:** 2-3 hours  
**Dependencies:** Real prices (done)  
**Value:** Long-term insights

**Scope:**
- Daily/weekly/monthly performance charts
- Benchmark comparison (S&P 500, TSX)
- Dividend tracking
- Total return vs price return
- Time-weighted vs money-weighted returns

---

### Advanced Filtering
**Status:** Basic filters  
**Effort:** 1-2 hours  
**Dependencies:** None  
**Value:** Better data exploration

**Scope:**
- Search by symbol, date range, amount
- Filter by broker, account type
- Complex AND/OR filters
- Save custom searches
- Quick filters (this month, this year, etc.)

---

### Keyboard Shortcuts
**Status:** None  
**Effort:** 1 hour  
**Dependencies:** None  
**Value:** Power user efficiency

**Scope:**
- Quick navigation (1-5 for tabs)
- Quick add transaction (Ctrl+N)
- Search (Ctrl+/)
- Esc to close modals
- Arrow keys for table navigation

---

### Offline Mode (PWA)
**Status:** None  
**Effort:** 2-3 hours  
**Dependencies:** None  
**Value:** Access anywhere

**Scope:**
- Service worker
- Cache portfolio data
- Queue actions when offline
- Sync when back online
- Install as app prompt

---

### Multi-Currency Dashboard View
**Status:** Converts to selected currency  
**Effort:** 1-2 hours  
**Dependencies:** FX system (done)  
**Value:** Currency exposure insights

**Scope:**
- Show holdings in original + multiple currencies
- Currency exposure breakdown chart
- FX gain/loss tracking
- Hedging recommendations
- Currency risk analysis

---

### INR Currency Support
**Status:** Not supported  
**Effort:** 2-3 hours  
**Dependencies:** New FX API (frankfurter doesn't have INR)  
**Value:** Support Indian market transactions

**Options:**
- Add secondary FX API (exchangerate-api.com) for INR only
- Manual INR rate entry with UI support
- Use alternate free API with INR support

**Current Workaround:**
- UI shows warning when INR detected
- User must enter manual FX rate

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
- Session timeout
- Rate limiting improvements
- Input sanitization

---

### Testing
**Effort:** 3-4 hours

- Unit tests for calculations (P/L, ARR, FX conversions)
- Edge case testing
- Browser compatibility
- Mobile device testing
- Automated regression tests

---

### Documentation
**Effort:** 2 hours

- API documentation
- Code architecture diagrams
- User guide (screenshots)
- Video tutorial
- FAQ page

---

## 💡 Future Ideas (Not Prioritized)

- AI-powered portfolio insights ("You should consider selling AAPL based on...")
- Tax-loss harvesting suggestions
- Broker API integrations (auto-import transactions)
- Voice commands ("Alexa, what's my portfolio worth?")
- Social features (compare performance with friends)
- Custom ML model for PDF parsing (reduce Gemini dependency)
- Notifications/alerts (price targets, rebalancing)
- Watchlist feature
- Recurring investment tracking
- Portfolio rebalancing recommendations

---

## Timeline Estimate

**Immediate (Next Week):**
- Backend proxy setup (HIGH - enables public hosting)
- Update documentation

**Next 2 Weeks:**
- UI redesign
- Settings page
- Data export

**Next Month:**
- Charts & analytics
- File management
- Data validation

**Next Quarter:**
- Batch processing
- Transaction editing (with FX menu)
- Advanced filtering
- Performance tracking

---

## Notes

- **INR Support:** Deferred until user demand increases (frankfurter.app doesn't support it)
- **Backend Proxy:** Critical for enabling public demo and safe hosting
- **Transaction Editing:** Low priority but important for data quality
- **Batch Processing:** Nice-to-have, not essential for daily use

---

**Last Updated:** February 18, 2026