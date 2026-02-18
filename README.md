# 📊 Stock Portfolio Tracker

AI-powered portfolio tracker with automated contract note processing. Built for personal use, designed for privacy.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://kennethingram.github.io/StockTracker)
[![GitHub Pages](https://img.shields.io/badge/hosted-github%20pages-blue)](https://pages.github.com/)

## ✨ Features

### Current (v1.0)
- 🤖 **AI-Powered PDF Parsing** - Google Gemini Vision OCR for scanned contract notes
- 📁 **Google Drive Storage** - Your data stays in YOUR Drive
- 🔐 **OAuth Authentication** - Secure Google sign-in
- 💱 **Multi-Currency Support** - Track stocks in USD, CAD, GBP, EUR, etc.
- 📈 **Portfolio Analytics** - Holdings, P/L, ARR calculations
- 💰 **Real-Time Stock Prices** - Live prices from Twelve Data API
- 🌍 **Exchange Support** - LSE, TSX, NYSE, NASDAQ, and more
- 👤 **Multi-Account Holder Filtering** - Joint accounts, individual views
- ✅ **Human-in-the-Loop Validation** - Review AI extractions before saving
- 🗑️ **Transaction Management** - Delete transactions with confirmation
- ⭐ **Saved Filter Favorites** - Quick access to custom views
- 📱 **Responsive Design** - Works on desktop, tablet, phone

### Planned (See [BACKLOG.md](BACKLOG.md))
- 🔄 Batch PDF processing
- 💹 Live FX rates
- 📉 Performance charts
- ✏️ Transaction editing
- 🎨 UI redesign

## 🚀 Quick Start

### For Users

1. **Visit:** [https://kennethingram.github.io/StockTracker](https://kennethingram.github.io/StockTracker)
2. **Sign in** with your Google account
3. **Create an account** in the Accounts tab
4. **Upload contract notes** to your Google Drive folder
5. **Process them** in the Sync tab
6. **View your portfolio** in Overview/Holdings/Transactions

---

## 🔐 Setup Instructions (For Developers)

### Prerequisites

You'll need three API keys (all free):
1. **Google OAuth Client ID** - For Google sign-in
2. **Google Gemini API Key** - For AI PDF parsing
3. **Twelve Data API Key** - For real-time stock prices

---

### Step 1: Fork and Clone
```bash
git clone https://github.com/yourusername/StockTracker.git
cd StockTracker
```

---

### Step 2: Configure API Keys

**⚠️ IMPORTANT:** Never commit `config.js` with real API keys!

**2A: Copy the config template:**
```bash
cp config.example.js config.js
```

**2B: Get your API keys:**

#### **Google OAuth Client ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new project or select existing
3. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
4. Application type: **Web application**
5. Add authorized JavaScript origins:
   - `https://yourusername.github.io`
   - `http://127.0.0.1:5500` (for local testing)
6. Add authorized redirect URIs:
   - `https://yourusername.github.io/StockTracker`
   - `http://127.0.0.1:5500` (for local testing)
7. Copy the **Client ID**

#### **Google Gemini API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select your project
4. Copy the key
5. **IMMEDIATELY RESTRICT IT:**
   - Click **"Edit API key"**
   - Set **"Application restrictions"** → **"HTTP referrers"**
   - Add: `https://yourusername.github.io/*`
   - Add: `http://127.0.0.1:5500/*`
   - Click **"Save"**

#### **Twelve Data API Key:**
1. Go to [Twelve Data](https://twelvedata.com/pricing)
2. Sign up for **Free plan** (800 API calls/day)
3. Go to [API Keys](https://twelvedata.com/account/api-keys)
4. Copy your API key

**2C: Edit `config.js` and add your keys:**
```javascript
const CONFIG = {
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    geminiApiKey: 'AIzaSy_YOUR_GEMINI_KEY',
    twelveDataApiKey: 'abc123_YOUR_TWELVE_DATA_KEY',
    // ... rest of config
};
```

**2D: Save `config.js`**

**⚠️ DO NOT commit this file to Git!** It's in `.gitignore` to prevent accidental leaks.

---

### Step 3: Enable Required Google APIs

1. Go to [Google Cloud Console APIs Library](https://console.cloud.google.com/apis/library)
2. Enable these APIs:
   - **Google Drive API**
   - **Generative Language API** (for Gemini)

---

### Step 4: Deploy to GitHub Pages
```bash
# Make sure config.js is NOT staged for commit
git status

# It should show:
# Untracked files:
#   config.js  (this is correct - it's ignored)

# Deploy
git add .
git commit -m "Initial setup"
git push origin main
```

**Enable GitHub Pages:**
1. Go to your repo **Settings** → **Pages**
2. Source: **Deploy from branch**
3. Branch: **main** → **/ (root)**
4. Click **Save**
5. Wait 2-3 minutes
6. Visit: `https://yourusername.github.io/StockTracker`

---

### Step 5: Test Locally (Optional)

**Using Live Server (VS Code):**
1. Install **Live Server** extension
2. Right-click `index.html` → **"Open with Live Server"**
3. App opens at `http://127.0.0.1:5500`

**Using Python:**
```bash
python3 -m http.server 5500
```

**Visit:** `http://127.0.0.1:5500`

---

## 📖 How It Works

### Architecture
```
GitHub Pages (Static Host)
    ↓
JavaScript SPA (Client-Side Only)
    ↓
Google Drive (Database) + Gemini (AI Parser) + OAuth (Auth) + Twelve Data (Prices)
```

**No backend servers. No databases. Just your browser + Google APIs.**

### PDF Processing Flow
1. Upload PDF to Google Drive folder
2. App detects new file
3. Extract text (PDF.js) OR OCR image (Gemini Vision)
4. Parse with Gemini AI → Extract transactions
5. **You review** in validation table (with exchange selection)
6. Accept/reject/edit each transaction
7. Save to database (your Drive)

### Stock Price Updates
1. Click **"🔄 Refresh Prices"** in Overview tab
2. Fetches live prices from Twelve Data API
3. Prices cached for 15 minutes
4. Shows real P/L, ARR, and portfolio value

### Data Storage
- **Location:** `/StockTracker/stock-tracker-database.json` in your Google Drive
- **Format:** JSON
- **Backup:** Automatically synced by Google Drive
- **Access:** Only you (via OAuth)

---

## 🔒 Security & Privacy

### What's Secure
✅ OAuth 2.0 authentication (industry standard)  
✅ Data in YOUR Google Drive (you control it)  
✅ API keys restricted to your domain (HTTP referrer)  
✅ API keys NOT in Git repository (`.gitignore` protection)  
✅ HTTPS encryption (automatic on GitHub Pages)  
✅ No third-party tracking or analytics  
✅ Client-side only (no servers to hack)  

### What You Should Know
⚠️ API keys stored in local `config.js` (not committed to Git)  
⚠️ Browser-based (clear cache = clear session)  
⚠️ Free tier API limits (800 price calls/day, 25 Gemini calls/day)  

### Best Practices
- Never commit `config.js` with real API keys
- Use a private GitHub repo if concerned about code visibility
- Restrict all API keys to your specific domains
- Enable 2FA on Google account
- Regular Drive backups

### If API Keys Leak
1. **Immediately delete** the leaked key in Google AI Studio
2. **Create a new key** and restrict it
3. **Update local `config.js`** (don't commit)
4. **Remove from Git history:**
```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch config.js" \
   --prune-empty --tag-name-filter cat -- --all
```

---

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)  
**Libraries:** PDF.js (Mozilla)  
**APIs:** 
- Google Drive API (storage)
- Google Gemini API (AI parsing)
- Google OAuth 2.0 (authentication)
- Twelve Data API (stock prices)

**Hosting:** GitHub Pages  
**Storage:** JSON in Google Drive  

**No frameworks. No build tools. No backend.**

---

## 📂 Project Structure
```
/StockTracker
├── index.html              # App shell
├── config.js               # API keys & settings (NOT in Git - see config.example.js)
├── config.example.js       # Template for config.js
├── .gitignore              # Prevents committing secrets
├── styles.css              # Global styles
├── /modules                # Core logic
│   ├── auth.js            # OAuth
│   ├── database.js        # Data management
│   ├── drive.js           # Drive integration
│   ├── parser.js          # AI PDF parsing
│   ├── portfolio.js       # Analytics
│   ├── prices.js          # Stock price fetching
│   ├── ui.js              # UI rendering
│   └── currency.js        # FX rates (placeholder)
├── README.md              # This file
├── ARCHITECTURE.md        # Technical details
└── BACKLOG.md            # Feature roadmap
```

---

## 🐛 Known Issues

- FX rates require manual entry (API integration coming)
- Batch processing not implemented
- Mobile UI needs polish
- No offline support

See [BACKLOG.md](BACKLOG.md) for full list.

---

## 🗺️ Roadmap

### v1.1 (Current)
- [x] Real stock price API integration
- [x] Exchange support (LSE, TSX, NYSE, etc.)
- [ ] Batch PDF processing
- [ ] FX rate API integration

### v1.2
- [ ] UI redesign (color scheme, layouts)
- [ ] Transaction editing
- [ ] Performance charts

### v2.0
- [ ] Advanced analytics
- [ ] Tax reporting
- [ ] Mobile app (PWA)

---

## 🤝 Contributing

This is a personal project, but contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

**Note:** Never commit API keys! Always use `config.example.js` as a template.

---

## 📄 License

MIT License - feel free to use, modify, and share.

---

## 🙏 Acknowledgments

- **Google Gemini** - AI-powered OCR and parsing
- **Twelve Data** - Real-time stock price API
- **PDF.js (Mozilla)** - Client-side PDF rendering
- **Google Drive API** - Serverless database storage

---

## 📧 Contact

Built by Kenneth Ingram  
Questions? Open an issue on GitHub.

---

**⭐ Star this repo if you find it useful!**