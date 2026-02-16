// Configuration file for StockTracker
// This holds your app settings (but NOT secret API keys!)

// ===================================
// TEST MODE (set to true to bypass login with dummy data)
// ===================================
const TEST_MODE = false;  // Set to false for production

const CONFIG = {
    // Google OAuth Settings
    // You'll get this Client ID from Google Cloud Console
    googleClientId: '562186675674-1lsb34607tcrl3a4q9vm4iv4qrueo09b.apps.googleusercontent.com',

    // Gemini API settings
    geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE',      // ← Replace with placeholder
    
    // Google Drive folder where contract notes are stored
    // Leave empty for now - we'll set this up later
    contractNotesFolderId: '',
    
    // Name of the database file stored in Google Drive
    databaseFileName: 'stocktracker-transactions.json',
    
    // Netlify function URL for Claude API parsing
    // This will be your deployed Netlify URL + /.netlify/functions/parse
    parseApiUrl: 'http://localhost:8888/.netlify/functions/parse', // For local testing
    
    // App settings
    appName: 'StockTracker',
    version: '1.0.0',
    
    // Google Drive API scopes (permissions we need)
    driveScopes: [
        'https://www.googleapis.com/auth/drive.file', // Access files created by this app
        'https://www.googleapis.com/auth/drive.readonly' // Read files in Drive
    ].join(' '),
    
    // ===================================
    // CURRENCY SETTINGS
    // ===================================
    
    // Your base/reporting currency (all totals converted to this)
    baseCurrency: 'CAD',
    
    // Supported currencies with display info
    supportedCurrencies: [
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
        { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' }
    ],
    
    // Free FX rate API (no key required for basic usage)
    // Alternative: https://api.exchangerate.host/latest?base=USD
    fxApiUrl: 'https://api.exchangerate-api.com/v4/latest/',
    
    // ===================================
    // ACCOUNT SETTINGS
    // ===================================
    
    // Account types available
    accountTypes: [
        { value: 'individual', label: 'Individual/Personal' },
        { value: 'tfsa', label: 'TFSA (Tax-Free Savings Account)' },
        { value: 'rrsp', label: 'RRSP (Registered Retirement Savings)' },
        { value: 'resp', label: 'RESP (Registered Education Savings)' },
        { value: 'fhsa', label: 'FHSA (First Home Savings Account)' },
        { value: 'isa', label: 'ISA (Individual Savings Account - UK)' },
        { value: 'sipp', label: 'SIPP (Self-Invested Personal Pension - UK)' },
        { value: 'margin', label: 'Margin Account' },
        { value: 'cash', label: 'Cash Account' },
        { value: 'joint', label: 'Joint Account' },
        { value: 'corporate', label: 'Corporate Account' },
        { value: 'trust', label: 'Trust Account' },
        { value: 'ira', label: 'IRA (Individual Retirement Account)' },
        { value: '401k', label: '401(k)' }
    ],
    
    // Known broker platforms (helps with auto-detection)
    knownBrokers: [
        { platform: 'schwab', name: 'Charles Schwab', country: 'US' },
        { platform: 'ibkr', name: 'Interactive Brokers', country: 'US' },
        { platform: 'fidelity', name: 'Fidelity', country: 'US' },
        { platform: 'vanguard', name: 'Vanguard', country: 'US' },
        { platform: 'questrade', name: 'Questrade', country: 'CA' },
        { platform: 'wealthsimple', name: 'Wealthsimple', country: 'CA' },
        { platform: 'td', name: 'TD Direct Investing', country: 'CA' },
        { platform: 'rbc', name: 'RBC Direct Investing', country: 'CA' },
        { platform: 'bmo', name: 'BMO InvestorLine', country: 'CA' },
        { platform: 'Scotia iTRADE', name: 'Scotia iTRADE', country: 'CA' }
    ]
};

// Make CONFIG available to other files
// (This is how we share settings across modules)