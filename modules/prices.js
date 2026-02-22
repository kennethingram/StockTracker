// ===================================
// PRICES MODULE
// Hybrid approach: Finnhub + Alpha Vantage
// Routes to appropriate API based on exchange
// ===================================

const Prices = {
    // Cache for prices (avoid excessive API calls)
    priceCache: {},

    // Cache expiry time (15 minutes)
    CACHE_DURATION: 15 * 60 * 1000,

    // Short-lived cache for failed fetches — prevents hammering the API on repeated failures
    failedFetchCache: {},
    FAILED_FETCH_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    // Rate limiting for Alpha Vantage (25/day, persisted in localStorage across page loads)
    MAX_ALPHA_VANTAGE_CALLS_PER_DAY: 25,
    
    // Rate limiting for Finnhub
    finnhubCallCount: 0,
    finnhubResetTime: Date.now(),
    MAX_FINNHUB_CALLS_PER_MINUTE: 60,
    
    /**
     * Get current price for a stock symbol
     * Returns object with { price, currency }
     */
    getCurrentPrice: async function(symbol, exchange = null) {
        console.log('Getting price for:', symbol, exchange ? `(${exchange})` : '');
        
        // Determine which API to use based on exchange
        const useAlphaVantage = this.shouldUseAlphaVantage(exchange);
        
        // Format symbol appropriately
        const formattedSymbol = useAlphaVantage 
            ? this.formatSymbolForAlphaVantage(symbol, exchange)
            : this.formatSymbolForFinnhub(symbol, exchange);
        
        // Check price cache first
        const cacheKey = formattedSymbol;
        const cached = this.getCachedPrice(cacheKey);
        if (cached) {
            console.log('Using cached price for', symbol, ':', cached);
            return cached;
        }

        // Check failed fetch cache — skip API call if this symbol recently returned nothing
        const recentFailure = this.failedFetchCache[cacheKey];
        if (recentFailure && Date.now() - recentFailure < this.FAILED_FETCH_CACHE_DURATION) {
            console.log('Skipping recent failed fetch for', symbol, '— trying last known price');
            return this.getLastKnownPrice(cacheKey);
        }

        // Check rate limits — still fall back to last known price if blocked
        if (useAlphaVantage && !this.checkAlphaVantageRateLimit()) {
            console.warn('Alpha Vantage rate limit reached (25/day) — trying last known price');
            return this.getLastKnownPrice(cacheKey);
        }

        if (!useAlphaVantage && !this.checkFinnhubRateLimit()) {
            console.warn('Finnhub rate limit reached (60/min) — trying last known price');
            return this.getLastKnownPrice(cacheKey);
        }

        try {
            const priceData = useAlphaVantage
                ? await this.fetchPriceFromAlphaVantage(formattedSymbol, exchange)
                : await this.fetchPriceFromFinnhub(formattedSymbol, exchange);

            if (priceData) {
                this.priceCache[cacheKey] = {
                    ...priceData,
                    timestamp: Date.now(),
                    source: useAlphaVantage ? 'AlphaVantage' : 'Finnhub'
                };
                this.saveLastKnownPrice(cacheKey, priceData);
                return priceData;
            }

            // Record failure so we don't retry for 5 minutes
            this.failedFetchCache[cacheKey] = Date.now();

            // Fall back to last known price from localStorage
            const lastKnown = this.getLastKnownPrice(cacheKey);
            if (lastKnown) {
                console.log('Using last known price for', symbol, '(stale, as of', lastKnown.asOf + ')');
                return lastKnown;
            }
            return null;

        } catch (error) {
            console.error('Error fetching price for', symbol, ':', error);
            return this.getLastKnownPrice(cacheKey);
        }
    },

    // Persist last successfully fetched price to localStorage
    saveLastKnownPrice: function(symbol, priceData) {
        const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        localStorage.setItem(`price_last_${symbol}`, JSON.stringify({
            price: priceData.price,
            currency: priceData.currency,
            date
        }));
    },

    // Retrieve last known price from localStorage, returned with stale flag
    getLastKnownPrice: function(symbol) {
        const stored = localStorage.getItem(`price_last_${symbol}`);
        if (!stored) return null;
        const data = JSON.parse(stored);
        return { price: data.price, currency: data.currency, stale: true, asOf: data.date };
    },
    
    /**
     * Determine if we should use Alpha Vantage for this exchange
     */
    shouldUseAlphaVantage: function(exchange) {
        if (!exchange) return false;
        
        // Use Alpha Vantage for UK stocks only
        const ukExchanges = ['LSE'];
        return ukExchanges.includes(exchange.toUpperCase());
    },
    
    /**
     * Format symbol for Alpha Vantage
     */
    formatSymbolForAlphaVantage: function(symbol, exchange) {
        let cleanSymbol = symbol.replace(/\.(L|TO|AX|DE)$/i, '');
        
        if (exchange && exchange.toUpperCase() === 'LSE') {
            return `${cleanSymbol}.LON`; // Alpha Vantage uses .LON for London
        }
        
        return cleanSymbol;
    },
    
    /**
     * Format symbol for Finnhub
     */
    formatSymbolForFinnhub: function(symbol, exchange) {
        if (!exchange) return symbol;
        
        let cleanSymbol = symbol.replace(/\.(L|TO|AX|DE|LON)$/i, '');
        
        switch (exchange.toUpperCase()) {
            case 'TSX':
                return `${cleanSymbol}.TO`;
            case 'ASX':
                return `${cleanSymbol}.AX`;
            case 'XETRA':
                return `${cleanSymbol}.DE`;
            case 'NYSE':
            case 'NASDAQ':
            default:
                return cleanSymbol;
        }
    },
    
    /**
     * Fetch price from Alpha Vantage
     * Returns { price, currency }
     */
    fetchPriceFromAlphaVantage: async function(symbol, exchange) {
        const apiKey = CONFIG.alphaVantageApiKey;
        
        if (!CONFIG.useProxy && (!apiKey || apiKey === 'YOUR_ALPHA_VANTAGE_API_KEY_HERE')) {
            console.warn('Alpha Vantage API key not configured');
            return null;
        }

        const url = CONFIG.useProxy
            ? `/api/prices?source=alphavantage&symbol=${encodeURIComponent(symbol)}`
            : `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        
        console.log('Fetching price from Alpha Vantage for:', symbol);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.Note && data.Note.includes('API call frequency')) {
            console.error('Alpha Vantage API limit reached');
            return null;
        }
        
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
            let price = parseFloat(data['Global Quote']['05. price']);
            let currency = 'USD'; // Default
            
            // Determine currency based on exchange
            if (exchange) {
                switch (exchange.toUpperCase()) {
                    case 'LSE':
                        currency = 'GBP';
                        // LSE prices are in pence (GBX), convert to pounds
                        price = price / 100;
                        console.log(`✅ Price for ${symbol} (Alpha Vantage): ${price} GBP (converted from pence)`);
                        break;
                    case 'TSX':
                        currency = 'CAD';
                        console.log(`✅ Price for ${symbol} (Alpha Vantage): ${price} CAD`);
                        break;
                    case 'ASX':
                        currency = 'AUD';
                        console.log(`✅ Price for ${symbol} (Alpha Vantage): ${price} AUD`);
                        break;
                    case 'XETRA':
                    case 'EURONEXT':
                        currency = 'EUR';
                        console.log(`✅ Price for ${symbol} (Alpha Vantage): ${price} EUR`);
                        break;
                    default:
                        console.log(`✅ Price for ${symbol} (Alpha Vantage): ${price} ${currency}`);
                }
            } else {
                console.log(`✅ Price for ${symbol} (Alpha Vantage): ${price} ${currency}`);
            }
            
            return { price, currency };
        }
        
        console.warn('No price data from Alpha Vantage for', symbol);
        return null;
    },
    
    /**
     * Fetch price from Finnhub
     * Returns { price, currency }
     */
    fetchPriceFromFinnhub: async function(symbol, exchange) {
        const apiKey = CONFIG.finnhubApiKey;
        
        if (!CONFIG.useProxy && (!apiKey || apiKey === 'YOUR_FINNHUB_API_KEY_HERE')) {
            console.warn('Finnhub API key not configured');
            return null;
        }

        const url = CONFIG.useProxy
            ? `/api/prices?source=finnhub&symbol=${encodeURIComponent(symbol)}`
            : `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
        
        console.log('Fetching price from Finnhub for:', symbol);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.c && data.c > 0) {
            const price = parseFloat(data.c);
            
            // Determine currency based on exchange
            let currency = 'USD'; // Default for US stocks
            
            if (exchange) {
                switch (exchange.toUpperCase()) {
                    case 'TSX':
                        currency = 'CAD';
                        break;
                    case 'LSE':
                        currency = 'GBP';
                        break;
                    case 'ASX':
                        currency = 'AUD';
                        break;
                    case 'XETRA':
                    case 'EURONEXT':
                        currency = 'EUR';
                        break;
                    default:
                        currency = 'USD';
                }
            }
            
            console.log(`✅ Price for ${symbol} (Finnhub): ${price} ${currency}`);
            return { price, currency };
        }
        
        console.warn('No price data from Finnhub for', symbol);
        return null;
    },
    
    /**
     * Get multiple prices in batch
     */
    getBatchPrices: async function(symbolsWithExchanges) {
        console.log('Fetching batch prices for:', symbolsWithExchanges);
        
        const results = {};
        
        const promises = symbolsWithExchanges.map(item => {
            const symbol = typeof item === 'string' ? item : item.symbol;
            const exchange = typeof item === 'object' ? item.exchange : null;
            
            return this.getCurrentPrice(symbol, exchange)
                .then(price => {
                    results[symbol] = price;
                })
                .catch(error => {
                    console.error('Error fetching', symbol, ':', error);
                    results[symbol] = null;
                });
        });
        
        await Promise.all(promises);
        
        return results;
    },
    
    /**
     * Check if we have a valid cached price
     */
    getCachedPrice: function(cacheKey) {
        const cached = this.priceCache[cacheKey];
        
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > this.CACHE_DURATION) {
            delete this.priceCache[cacheKey];
            return null;
        }
        
        // Return full price data object (not just price)
        return { price: cached.price, currency: cached.currency };
    },
    
    /**
     * Clear price cache
     */
    clearCache: function() {
        console.log('Clearing price cache');
        this.priceCache = {};
    },
    
    /**
     * Check Alpha Vantage rate limit (25 per day).
     * Persisted in localStorage so the count survives page refreshes.
     */
    checkAlphaVantageRateLimit: function() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('av_calls');
        let data = stored ? JSON.parse(stored) : { count: 0, date: today };

        // Reset if it's a new day
        if (data.date !== today) {
            data = { count: 0, date: today };
        }

        if (data.count >= this.MAX_ALPHA_VANTAGE_CALLS_PER_DAY) {
            console.warn(`Alpha Vantage daily limit reached (${data.count}/${this.MAX_ALPHA_VANTAGE_CALLS_PER_DAY})`);
            return false;
        }

        data.count++;
        localStorage.setItem('av_calls', JSON.stringify(data));
        console.log(`Alpha Vantage calls: ${data.count}/${this.MAX_ALPHA_VANTAGE_CALLS_PER_DAY} today`);
        return true;
    },
    
    /**
     * Check Finnhub rate limit (60 per minute)
     */
    checkFinnhubRateLimit: function() {
        const now = Date.now();
        const minuteInMs = 60 * 1000;
        
        if (now - this.finnhubResetTime > minuteInMs) {
            this.finnhubCallCount = 0;
            this.finnhubResetTime = now;
        }
        
        if (this.finnhubCallCount >= this.MAX_FINNHUB_CALLS_PER_MINUTE) {
            return false;
        }
        
        this.finnhubCallCount++;
        console.log(`Finnhub calls: ${this.finnhubCallCount}/${this.MAX_FINNHUB_CALLS_PER_MINUTE} this minute`);
        
        return true;
    },
    
    /**
     * Get cache status info
     */
    getCacheInfo: function() {
        const symbols = Object.keys(this.priceCache);
        const ages = symbols.map(symbol => {
            const age = Date.now() - this.priceCache[symbol].timestamp;
            return Math.floor(age / 1000 / 60);
        });
        
        return {
            symbols: symbols.length,
            oldestAge: Math.max(...ages, 0),
            alphaVantageCalls: this.alphaVantageCallCount,
            finnhubCalls: this.finnhubCallCount
        };
    },
    
    /**
     * Format last updated time
     */
    getLastUpdatedText: function(symbol) {
        const cached = this.priceCache[symbol];
        if (!cached) return 'Never';
        
        const age = Date.now() - cached.timestamp;
        const minutes = Math.floor(age / 1000 / 60);
        
        if (minutes === 0) return 'Just now';
        if (minutes === 1) return '1 minute ago';
        if (minutes < 60) return `${minutes} minutes ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours === 1) return '1 hour ago';
        return `${hours} hours ago`;
    }
};