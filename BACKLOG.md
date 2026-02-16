# Feature Backlog

Priority levels: 🔴 High | 🟡 Medium | 🟢 Low

## 🔴 High Priority

### Real Stock Prices
**Status:** Not started  
**Effort:** 2-3 hours  
**Dependencies:** API selection (Twelve Data recommended)  
**Value:** Makes portfolio actually useful for daily tracking

**Scope:**
- Integrate free stock price API
- Auto-refresh mechanism (manual + 15min intervals)
- Cache prices (reduce API calls)
- Show last updated timestamp
- Handle API errors gracefully

---

### Batch PDF Processing
**Status:** UI placeholder exists  
**Effort:** 1-2 hours  
**Dependencies:** None  
**Value:** Process backlog of PDFs quickly

**Scope:**
- Functional "Process All" button
- Queue system for multiple files
- Progress indicator (X of Y processed)
- Error handling (continue on failure)
- Summary report after completion

---

### FX Rate API Integration
**Status:** Manual entry only  
**Effort:** 2 hours  
**Dependencies:** API selection (exchangerate-api.io recommended)  
**Value:** Accurate multi-currency portfolio valuations

**Scope:**
- Auto-populate FX rates when adding transactions
- Historical rates for accurate ARR
- Cache daily rates
- Fallback to manual entry if API fails

---

## 🟡 Medium Priority

### UI/UX Redesign
**Status:** Basic UI functional  
**Effort:** 3-4 hours  
**Dependencies:** None  
**Value:** Better daily user experience

**Scope:**
- Color scheme update (user choice: dark/light/gradient)
- Better card layouts with shadows
- Improved typography
- Mobile responsiveness
- Dark mode toggle

---

### Transaction Editing
**Status:** Delete only  
**Effort:** 2 hours  
**Dependencies:** None  
**Value:** Fix mistakes without re-processing

**Scope:**
- Edit existing transactions (all fields)
- Bulk edit (account, FX rates)
- Duplicate detection
- Edit history log

---

### Portfolio Charts & Analytics
**Status:** Basic stats only  
**Effort:** 3-4 hours  
**Dependencies:** Real prices helpful  
**Value:** Visual insights

**Scope:**
- Performance over time (line chart)
- Sector allocation (pie chart)
- Asset allocation by currency
- P/L breakdown by holding
- Export charts as images

---

### Settings Page
**Status:** None  
**Effort:** 1-2 hours  
**Dependencies:** None  
**Value:** User control

**Scope:**
- Change base currency
- Update API keys
- Clear all data (with confirmation)
- Export/import database
- Theme preferences

---

### Data Export
**Status:** None  
**Effort:** 1-2 hours  
**Dependencies:** None  
**Value:** Backup and external analysis

**Scope:**
- Export to CSV (transactions, holdings)
- Export to Excel
- Download database JSON backup
- Email reports

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

---

## 🟢 Low Priority

### Performance Tracking
**Status:** ARR calculated  
**Effort:** 2-3 hours  
**Dependencies:** Real prices  
**Value:** Long-term insights

**Scope:**
- Daily/weekly/monthly charts
- Benchmark comparison (S&P 500, TSX)
- Dividend tracking
- Total return vs price return

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

---

### Multi-Currency Dashboard View
**Status:** Converts to CAD only  
**Effort:** 2 hours  
**Dependencies:** None  
**Value:** Currency exposure insights

**Scope:**
- Show holdings in original + base currency
- Currency exposure chart
- Hedging recommendations

---

## 🔵 Technical Debt

### Code Cleanup
**Effort:** 2-3 hours

- Remove verbose console.logs
- Add JSDoc comments
- Refactor duplicate code
- Consistent naming conventions

---

### Security Enhancements
**Effort:** 1-2 hours

- Add Content Security Policy
- Subresource Integrity for CDNs
- Session timeout
- Rate limiting improvements

---

### Testing
**Effort:** 3-4 hours

- Unit tests for calculations
- Edge case testing
- Browser compatibility
- Mobile device testing

---

## 💡 Future Ideas (Not Prioritized)

- AI-powered portfolio insights
- Tax-loss harvesting suggestions
- Broker API integrations
- Voice commands
- Social features (compare performance)
- Custom ML model for PDF parsing
- Notifications/alerts

---

## Timeline Estimate

**Next 2 weeks:**
- Real stock prices
- Batch processing
- FX rates

**Next month:**
- UI redesign
- Transaction editing
- Charts

**Next quarter:**
- Settings page
- Data export
- File management
- Validation improvements

---

**Last Updated:** February 15, 2026