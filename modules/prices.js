// ===================================
// PRICES MODULE
// Single source: Yahoo Finance (unofficial API, no key required)
// ===================================

const Prices = {
    // Cache for prices (avoid excessive API calls)
    priceCache: {},

    // Cache expiry time (15 minutes)
    CACHE_DURATION: 15 * 60 * 1000,

    // Short-lived cache for failed fetches — prevents hammering the API on repeated failures
    failedFetchCache: {},
    FAILED_FETCH_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    /**
     * Get current price for a stock symbol.
     * Returns { price, currency } or null.
     */
    getCurrentPrice: async function(symbol, exchange = null) {
        console.log('Getting price for:', symbol, exchange ? `(${exchange})` : '');

        const yahooSymbol = this.formatSymbolForYahoo(symbol, exchange);

        // Check price cache first
        const cached = this.getCachedPrice(yahooSymbol);
        if (cached) {
            console.log('Using cached price for', symbol, ':', cached);
            return cached;
        }

        // Check failed fetch cache — skip API call if this symbol recently returned nothing
        const recentFailure = this.failedFetchCache[yahooSymbol];
        if (recentFailure && Date.now() - recentFailure < this.FAILED_FETCH_CACHE_DURATION) {
            console.log('Skipping recent failed fetch for', symbol, '— trying last known price');
            return this.getLastKnownPrice(yahooSymbol);
        }

        try {
            const priceData = await this.fetchPriceFromYahoo(yahooSymbol);

            if (priceData) {
                this.priceCache[yahooSymbol] = {
                    ...priceData,
                    timestamp: Date.now(),
                    source: 'Yahoo',
                };
                this.saveLastKnownPrice(yahooSymbol, priceData);
                return priceData;
            }

            // Record failure so we don't retry for 5 minutes
            this.failedFetchCache[yahooSymbol] = Date.now();

            // Fall back to last known price from localStorage
            const lastKnown = this.getLastKnownPrice(yahooSymbol);
            if (lastKnown) {
                console.log('Using last known price for', symbol, '(stale, as of', lastKnown.asOf + ')');
                return lastKnown;
            }
            return null;

        } catch (error) {
            console.error('Error fetching price for', symbol, ':', error);
            return this.getLastKnownPrice(yahooSymbol);
        }
    },

    /**
     * Format ticker symbol for Yahoo Finance.
     * Strips any existing suffixes first, then applies the correct one.
     */
    formatSymbolForYahoo: function(symbol, exchange) {
        // Strip any suffixes from previous API formats
        let clean = symbol.replace(/\.(L|TO|AX|DE|LON)$/i, '');

        if (!exchange) return clean;

        switch (exchange.toUpperCase()) {
            case 'LSE':    return `${clean}.L`;
            case 'TSX':    return `${clean}.TO`;
            case 'ASX':    return `${clean}.AX`;
            case 'XETRA':  return `${clean}.DE`;
            case 'NYSE':
            case 'NASDAQ':
            default:       return clean;
        }
    },

    /**
     * Fetch price from Yahoo Finance.
     * Via Cloudflare proxy in production; direct in local dev.
     * Returns { price, currency } or null.
     */
    fetchPriceFromYahoo: async function(yahooSymbol) {
        const url = CONFIG.useProxy
            ? `${CONFIG.pricesProxyUrl}?symbol=${encodeURIComponent(yahooSymbol)}`
            : `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;

        console.log('Fetching price from Yahoo Finance for:', yahooSymbol);

        const response = await fetch(url);
        const data = await response.json();

        const result = data.chart?.result?.[0];
        if (!result) {
            const errMsg = data.chart?.error?.description || 'No result';
            console.warn('No Yahoo Finance data for', yahooSymbol, '—', errMsg);
            return null;
        }

        const meta = result.meta;
        let price = meta?.regularMarketPrice;
        let currency = meta?.currency;

        if (!price || price <= 0) {
            console.warn('Yahoo Finance returned zero/null price for', yahooSymbol);
            return null;
        }

        // Yahoo returns LSE prices in GBp (pence) — convert to GBP pounds
        if (currency === 'GBp') {
            price = price / 100;
            currency = 'GBP';
        }

        console.log(`✅ Price for ${yahooSymbol} (Yahoo): ${price} ${currency}`);
        return { price, currency };
    },

    /**
     * Get multiple prices in batch.
     */
    getBatchPrices: async function(symbolsWithExchanges) {
        console.log('Fetching batch prices for:', symbolsWithExchanges);

        const results = {};

        const promises = symbolsWithExchanges.map(item => {
            const symbol   = typeof item === 'string' ? item : item.symbol;
            const exchange = typeof item === 'object' ? item.exchange : null;

            return this.getCurrentPrice(symbol, exchange)
                .then(price => { results[symbol] = price; })
                .catch(error => {
                    console.error('Error fetching', symbol, ':', error);
                    results[symbol] = null;
                });
        });

        await Promise.all(promises);
        return results;
    },

    // Persist last successfully fetched price to localStorage
    saveLastKnownPrice: function(symbol, priceData) {
        const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        localStorage.setItem(`price_last_${symbol}`, JSON.stringify({
            price: priceData.price,
            currency: priceData.currency,
            date,
        }));
    },

    // Retrieve last known price — checks localStorage first, then Drive database (cross-device)
    getLastKnownPrice: function(symbol) {
        // Fast path: localStorage (same device)
        const stored = localStorage.getItem(`price_last_${symbol}`);
        if (stored) {
            const data = JSON.parse(stored);
            return { price: data.price, currency: data.currency, stale: true, asOf: data.date };
        }

        // Fallback: prices saved to Drive DB on last manual refresh (works across devices)
        if (typeof Database !== 'undefined') {
            const dbData = Database.getData();
            const dbEntry = dbData?.settings?.lastPrices?.[symbol];
            if (dbEntry) {
                localStorage.setItem(`price_last_${symbol}`, JSON.stringify(dbEntry));
                return { price: dbEntry.price, currency: dbEntry.currency, stale: true, asOf: dbEntry.date };
            }
        }

        return null;
    },

    /**
     * Check if we have a valid cached price.
     */
    getCachedPrice: function(cacheKey) {
        const cached = this.priceCache[cacheKey];
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.CACHE_DURATION) {
            delete this.priceCache[cacheKey];
            return null;
        }

        return { price: cached.price, currency: cached.currency };
    },

    /**
     * Clear price cache (and failed fetch cache so refresh actually retries).
     */
    clearCache: function() {
        console.log('Clearing price cache');
        this.priceCache = {};
        this.failedFetchCache = {};
    },

    /**
     * Get cache status info.
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
        };
    },

    /**
     * Format last updated time.
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
    },
};
