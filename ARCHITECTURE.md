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
│                      GITHUB PAGES (Static Host)                  │
│                  https://kennethingram.github.io/StockTracker    │
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
│  │ - Modals     │  │ - Parser     │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  GOOGLE DRIVE   │ │  GOOGLE GEMINI  │ │  GOOGLE OAUTH    │
│  API            │ │  API            │ │                  │
│                 │ │                 │ │                  │
│ - Database JSON │ │ - PDF OCR       │ │ - Authentication │
│ - File Storage  │ │ - Vision AI     │ │ - Authorization  │
│ - Contract Notes│ │ - Text Extract  │ │                  │
└─────────────────┘ └─────────────────┘ └──────────────────┘
```

## Tech Stack

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (custom, no frameworks)
- **Vanilla JavaScript** - All logic (ES6+)
- **PDF.js** - PDF text extraction
- **No build tools** - Direct deployment

### Backend/Services
- **GitHub Pages** - Static hosting
- **Google Drive API** - Database storage (JSON file)
- **Google Gemini API** - AI-powered PDF parsing (Vision + Text)
- **Google OAuth 2.0** - Authentication

### Data Storage
- **Primary:** JSON file in user's Google Drive (`/StockTracker/stock-tracker-database.json`)
- **Structure:**
```javascript
  {
    accounts: {},        // Trading accounts
    transactions: [],    // All trades
    processedFiles: [],  // Tracking processed PDFs
    favorites: {},       // Saved filter combinations
    settings: {}         // User preferences
  }
```

## Module Architecture
```
/StockTracker
│
├── index.html                 # Main application shell
├── config.js                  # Configuration (API keys, settings)
├── styles.css                 # Global styles
│
├── /modules                   # Core business logic
│   ├── auth.js               # Google OAuth authentication
│   ├── database.js           # Drive storage & data management
│   ├── drive.js              # Drive API integration
│   ├── parser.js             # AI-powered PDF parsing (Gemini)
│   ├── portfolio.js          # Portfolio calculations & analytics
│   ├── prices.js             # Stock price management (placeholder)
│   ├── currency.js           # FX rate handling (placeholder)
│   └── ui.js                 # UI rendering & event handling
│
└── README.md                 # Documentation
```

## Data Flow

### 1. Authentication Flow
```
User → Click "Sign In" → Google OAuth Consent → 
Token Received → Database.init() → Load JSON from Drive → 
App Ready
```

### 2. Contract Note Processing Flow
```
User uploads PDF to Drive folder → 
App scans folder → Shows unprocessed files → 
User clicks "Process" → 

[Text PDF Path]
  PDF.js extracts text → Gemini Text API → Parse JSON

[Image PDF Path]  
  Convert to base64 → Gemini Vision API → OCR + Parse JSON

→ Validation Modal (human-in-the-loop) →
User reviews/edits → Accepts/Rejects → 
Accepted transactions saved to database → 
File marked as processed → Sync to Drive
```

### 3. Portfolio Calculation Flow
```
Load transactions from database → 
Group by symbol → Calculate positions → 
Fetch current prices (placeholder) → 
Apply FX rates → Calculate P/L & ARR → 
Render to UI
```

## Security Model

### API Key Protection
- **Gemini API Key:** Restricted to GitHub Pages domain via HTTP referrer
- **Google OAuth:** Restricted redirect URLs
- **Data:** Stored in user's own Google Drive (not on servers)

### Authentication
- OAuth 2.0 with PKCE flow
- Token stored in sessionStorage (cleared on tab close)
- Scopes: `drive.file` (limited access)

### Data Privacy
- All processing client-side (browser)
- No backend servers
- No data collection/tracking
- User controls all data deletion

## Current Limitations

1. **Stock Prices:** Placeholder data (not real-time)
2. **FX Rates:** Manual entry only
3. **Batch Processing:** UI exists but not functional
4. **Mobile UI:** Basic responsiveness only
5. **Offline:** No service worker (online only)

## Performance Considerations

- **Rate Limiting:** 100 Gemini API calls/hour (client-side enforcement)
- **Caching:** None implemented yet
- **Database Size:** All data loaded in memory (works for <10,000 transactions)
- **PDF Processing:** Sequential only (one at a time)

## Deployment

**Host:** GitHub Pages
**URL:** `https://kennethingram.github.io/StockTracker`
**Deploy Process:** `git push origin main` → Auto-deploy (~2 min)

## Future Architecture Changes

See [BACKLOG.md](BACKLOG.md) for planned features.

**Major architectural changes planned:**
- Real stock price API integration
- FX rate API integration  
- Batch processing queue
- Client-side caching layer
- Performance monitoring