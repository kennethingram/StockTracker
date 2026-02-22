// ===================================
// CONFIGURATION TEMPLATE
// Copy this file to config.js and fill in your values.
// NEVER commit config.js to GitHub!
// ===================================
//
// HOW API KEYS WORK:
// - In production (Cloudflare Pages): API keys live in Cloudflare environment secrets.
//   The app calls /api/gemini and /api/prices — the proxy injects the keys server-side.
//   The keys below are NOT used in production.
// - In local development (localhost): The app calls the APIs directly using the keys below.
//   Keep them here, and keep this file out of Git.
// ===================================

// Detect environment automatically
const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

const CONFIG = {
    // When deployed, API calls go through the Cloudflare proxy.
    // When local, API calls go directly to the APIs using the keys below.
    useProxy: !IS_LOCAL,

    // Google OAuth Client ID (public — safe to commit if needed)
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID_HERE',

    // -------------------------------------------------------
    // LOCAL DEVELOPMENT ONLY — not used in production
    // In production, set these as Cloudflare environment secrets instead.
    // -------------------------------------------------------

    // Google Gemini API Key — https://aistudio.google.com/app/apikey
    geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE',

    // Finnhub: US/Canadian stocks (60 calls/min) — https://finnhub.io/register
    finnhubApiKey: 'YOUR_FINNHUB_API_KEY_HERE',

    // Alpha Vantage: UK/international stocks (25 calls/day) — https://www.alphavantage.co/support/#api-key
    alphaVantageApiKey: 'YOUR_ALPHA_VANTAGE_API_KEY_HERE',

    // Database settings
    databaseFileName: 'stock-tracker-database.json',
    
    // Base currency for portfolio calculations
    baseCurrency: 'CAD',
    
    // Supported account types
    accountTypes: [
        { value: 'isa', label: 'ISA (UK)' },
        { value: 'sipp', label: 'SIPP (UK)' },
        { value: 'tfsa', label: 'TFSA (Canada)' },
        { value: 'rrsp', label: 'RRSP (Canada)' },
        { value: 'taxable', label: 'Taxable Brokerage' },
        { value: 'roth_ira', label: 'Roth IRA (US)' },
        { value: 'traditional_ira', label: 'Traditional IRA (US)' },
        { value: '401k', label: '401(k) (US)' },
        { value: 'other', label: 'Other' }
    ],
    
    // Supported currencies
    supportedCurrencies: [
        { code: 'USD', name: 'US Dollar' },
        { code: 'CAD', name: 'Canadian Dollar' },
        { code: 'GBP', name: 'British Pound' },
        { code: 'EUR', name: 'Euro' },
        { code: 'JPY', name: 'Japanese Yen' },
        { code: 'AUD', name: 'Australian Dollar' },
        { code: 'CHF', name: 'Swiss Franc' },
        { code: 'CNY', name: 'Chinese Yuan' },
        { code: 'INR', name: 'Indian Rupee' }
    ],
    
    // Supported stock exchanges
    supportedExchanges: [
        { code: '', name: 'Auto-detect (US stocks)' },
        { code: 'LSE', name: 'London Stock Exchange' },
        { code: 'TSX', name: 'Toronto Stock Exchange' },
        { code: 'NYSE', name: 'New York Stock Exchange' },
        { code: 'NASDAQ', name: 'NASDAQ' },
        { code: 'XETRA', name: 'Deutsche Börse (Germany)' },
        { code: 'EURONEXT', name: 'Euronext (Europe)' },
        { code: 'ASX', name: 'Australian Securities Exchange' },
        { code: 'HKEX', name: 'Hong Kong Stock Exchange' },
        { code: 'JPX', name: 'Japan Exchange Group' }
    ]
};