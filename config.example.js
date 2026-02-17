// ===================================
// CONFIGURATION TEMPLATE
// Copy this file to config.js and fill in your API keys
// NEVER commit config.js to GitHub!
// ===================================

const CONFIG = {
    // Google OAuth Client ID (public - safe to commit)
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID_HERE',
    
    // Google Gemini API Key (PRIVATE - get from https://aistudio.google.com/app/apikey)
    geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE',
    
    // Stock Price API Keys
    // Finnhub: For US/Canadian stocks (60 calls/min) - https://finnhub.io/register
    finnhubApiKey: 'YOUR_FINNHUB_API_KEY_HERE',
    
    // Alpha Vantage: For UK/international stocks (25 calls/day) - https://www.alphavantage.co/support/#api-key
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