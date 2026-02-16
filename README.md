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
- 👤 **Multi-Account Holder Filtering** - Joint accounts, individual views
- ✅ **Human-in-the-Loop Validation** - Review AI extractions before saving
- 🗑️ **Transaction Management** - Delete transactions with confirmation
- ⭐ **Saved Filter Favorites** - Quick access to custom views
- 📱 **Responsive Design** - Works on desktop, tablet, phone

### Planned (See [BACKLOG.md](BACKLOG.md))
- 📊 Real-time stock prices (API integration)
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

### For Developers (Fork & Deploy)

1. **Fork this repo**
2. **Enable GitHub Pages:**
   - Settings → Pages → Source: `main` branch
3. **Create Google OAuth Client:**
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add authorized origin: `https://yourusername.github.io`
4. **Get Gemini API Key:**
   - [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Restrict to your domain
5. **Update `config.js`:**
```javascript
   googleClientId: 'YOUR_CLIENT_ID',
   geminiApiKey: 'YOUR_API_KEY'
```
6. **Push to GitHub** → Auto-deploys to Pages

## 📖 How It Works

### Architecture
```
GitHub Pages (Static Host)
    ↓
JavaScript SPA (Client-Side Only)
    ↓
Google Drive (Database) + Gemini (AI Parser) + OAuth (Auth)
```

**No backend servers. No databases. Just your browser + Google APIs.**

### PDF Processing Flow
1. Upload PDF to Google Drive folder
2. App detects new file
3. Extract text (PDF.js) OR OCR image (Gemini Vision)
4. Parse with Gemini AI → Extract transactions
5. **You review** in validation table
6. Accept/reject/edit each transaction
7. Save to database (your Drive)

### Data Storage
- **Location:** `/StockTracker/stock-tracker-database.json` in your Google Drive
- **Format:** JSON
- **Backup:** Automatically synced by Google Drive
- **Access:** Only you (via OAuth)

## 🔒 Security & Privacy

### What's Secure
✅ OAuth 2.0 authentication (industry standard)  
✅ Data in YOUR Google Drive (you control it)  
✅ API keys restricted to your domain (HTTP referrer)  
✅ HTTPS encryption (automatic on GitHub Pages)  
✅ No third-party tracking or analytics  
✅ Client-side only (no servers to hack)  

### What You Should Know
⚠️ API keys visible in source code (but restricted to your domain)  
⚠️ Public repo (don't commit sensitive data)  
⚠️ Browser-based (clear cache = clear session)  

### Best Practices
- Use a private GitHub repo (optional)
- Restrict Gemini API key in Google Cloud Console
- Enable 2FA on Google account
- Regular Drive backups

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)  
**Libraries:** PDF.js (Mozilla)  
**APIs:** Google Drive, Google Gemini, Google OAuth  
**Hosting:** GitHub Pages  
**Storage:** JSON in Google Drive  

**No frameworks. No build tools. No dependencies.**

## 📂 Project Structure
```
/StockTracker
├── index.html              # App shell
├── config.js               # API keys & settings
├── styles.css              # Global styles
├── /modules                # Core logic
│   ├── auth.js            # OAuth
│   ├── database.js        # Data management
│   ├── drive.js           # Drive integration
│   ├── parser.js          # AI PDF parsing
│   ├── portfolio.js       # Analytics
│   ├── ui.js              # UI rendering
│   └── ...
├── README.md              # This file
├── ARCHITECTURE.md        # Technical details
└── BACKLOG.md            # Feature roadmap
```

## 🐛 Known Issues

- Stock prices are placeholders (not real-time)
- FX rates require manual entry
- Batch processing not implemented
- Mobile UI needs polish
- No offline support

See [BACKLOG.md](BACKLOG.md) for full list.

## 🗺️ Roadmap

### v1.1 (Next)
- [ ] Real stock price API integration
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

## 🤝 Contributing

This is a personal project, but contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use, modify, and share.

## 🙏 Acknowledgments

- **Google Gemini** - AI-powered OCR and parsing
- **PDF.js (Mozilla)** - Client-side PDF rendering
- **Google Drive API** - Serverless database storage

## 📧 Contact

Built by Kenneth Ingram  
Questions? Open an issue on GitHub.

---

**⭐ Star this repo if you find it useful!**