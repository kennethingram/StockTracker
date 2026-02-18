// ===================================
// FX MODULE
// Foreign Exchange Rate Management
// Uses frankfurter.app (European Central Bank data)
// FREE, TRUE HISTORICAL RATES, NO API KEY
// ===================================

const FX = {
    
    // Cache for live rates (1 hour TTL)
    liveRatesCache: null,
    liveCacheExpiry: null,
    LIVE_CACHE_DURATION: 60 * 60 * 1000, // 1 hour
    
    // Supported currencies (all available in frankfurter.app)
    SUPPORTED_CURRENCIES: ['CAD', 'GBP', 'USD', 'EUR', 'AUD', 'CHF'],
    
    // API endpoint (frankfurter.app - European Central Bank)
    API_BASE: 'https://api.frankfurter.app',
    
    /**
     * Get live FX rates for ALL supported currencies
     * Cached for 1 hour
     * Base currency: USD (for universal conversion)
     */
    getLiveRates: async function() {
        console.log('Getting live FX rates...');
        
        // Check cache
        if (this.liveRatesCache && this.liveCacheExpiry && Date.now() < this.liveCacheExpiry) {
            console.log('Using cached live rates');
            return this.liveRatesCache;
        }
        
        try {
            // Fetch from frankfurter (base USD)
            const response = await fetch(`${this.API_BASE}/latest?from=USD`);
            
            if (!response.ok) {
                throw new Error(`Frankfurter API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Format: data = { amount: 1, base: "USD", date: "2026-02-18", rates: {...} }
            
            // Build rates object with USD = 1.0
            const rates = { USD: 1.0 };
            this.SUPPORTED_CURRENCIES.forEach(currency => {
                if (currency !== 'USD' && data.rates[currency]) {
                    rates[currency] = data.rates[currency];
                }
            });
            
            // Cache the result
            this.liveRatesCache = {
                base: 'USD',
                rates: rates,
                date: data.date,
                fetchedAt: new Date().toISOString()
            };
            
            this.liveCacheExpiry = Date.now() + this.LIVE_CACHE_DURATION;
            
            console.log('✅ Live FX rates fetched:', this.liveRatesCache);
            
            // Save to database for persistence
            await this.saveLiveRatesToDatabase();
            
            return this.liveRatesCache;
            
        } catch (error) {
            console.error('Error fetching live FX rates:', error);
            
            // Try to use last known rates from database
            const dbRates = await this.loadLiveRatesFromDatabase();
            if (dbRates) {
                console.warn('⚠️ Using last known FX rates from database');
                this.liveRatesCache = dbRates;
                return dbRates;
            }
            
            throw error;
        }
    },
    
    /**
     * Fetch ALL currency rates for a specific date
     * Uses TRUE HISTORICAL DATA from frankfurter.app
     */
    fetchAllRatesForDate: async function(date) {
        console.log(`Fetching ALL FX rates for ${date}...`);
        
        // Check if we already have rates for this date
        const existing = await this.getAllRatesForDateFromDatabase(date);
        if (existing) {
            console.log('✅ Using existing rates from database for', date);
            return existing;
        }
        
        try {
            // Fetch historical rates from frankfurter (base USD)
            const response = await fetch(`${this.API_BASE}/${date}?from=USD`);
            
            if (!response.ok) {
                throw new Error(`Frankfurter API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Build rates object with USD = 1.0
            const rates = { USD: 1.0 };
            this.SUPPORTED_CURRENCIES.forEach(currency => {
                if (currency !== 'USD' && data.rates[currency]) {
                    rates[currency] = data.rates[currency];
                }
            });
            
            const ratesData = {
                base: 'USD',
                rates: rates,
                date: data.date,
                fetchedAt: new Date().toISOString()
            };
            
            // Save to database
            await this.saveAllRatesForDateToDatabase(date, ratesData);
            
            console.log(`✅ Fetched TRUE historical rates for ${date}:`, ratesData);
            
            return ratesData;
            
        } catch (error) {
            console.error(`Error fetching rates for ${date}:`, error);
            
            // Try to use closest available date
            const fallback = await this.getClosestDateRates(date);
            if (fallback) {
                console.warn(`⚠️ Using rates from closest date: ${fallback.date}`);
                return fallback.rates;
            }
            
            throw error;
        }
    },
    
    /**
     * Convert amount from one currency to another using historical rates
     */
    convertWithHistoricalRate: async function(amount, fromCurrency, toCurrency, date) {
        if (fromCurrency === toCurrency) {
            return amount;
        }
        
        // Get ALL rates for that date
        const ratesData = await this.fetchAllRatesForDate(date);
        
        // Convert via USD base
        const amountInUSD = amount / ratesData.rates[fromCurrency];
        const amountInTarget = amountInUSD * ratesData.rates[toCurrency];
        
        console.log(`Converted ${amount} ${fromCurrency} → ${amountInTarget.toFixed(2)} ${toCurrency} (${date})`);
        
        return amountInTarget;
    },
    
    /**
     * Convert amount using live rates
     */
    convertCurrency: async function(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return amount;
        }
        
        const rates = await this.getLiveRates();
        
        // Convert via USD base
        const amountInUSD = amount / rates.rates[fromCurrency];
        const convertedAmount = amountInUSD * rates.rates[toCurrency];
        
        return convertedAmount;
    },
    
    /**
     * Get live FX rate between two currencies
     */
    getRate: async function(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return 1.0;
        }
        
        const rates = await this.getLiveRates();
        
        // Convert via USD
        const rate = rates.rates[toCurrency] / rates.rates[fromCurrency];
        
        return rate;
    },
    
    /**
     * Get historical rate between two currencies for a specific date
     */
    getHistoricalRate: async function(date, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return 1.0;
        }
        
        const ratesData = await this.fetchAllRatesForDate(date);
        
        // Convert via USD
        const rate = ratesData.rates[toCurrency] / ratesData.rates[fromCurrency];
        
        console.log(`Historical rate ${date}: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
        
        return rate;
    },
    
    /**
     * Save live rates to database
     */
    saveLiveRatesToDatabase: async function() {
        if (!this.liveRatesCache || typeof Database === 'undefined') {
            return;
        }
        
        const data = Database.getData();
        
        if (!data.fxRates) {
            data.fxRates = {};
        }
        
        data.fxRates.live = {
            ...this.liveRatesCache,
            cachedUntil: new Date(this.liveCacheExpiry).toISOString()
        };
        
        await Database.saveToDrive();
        console.log('✅ Live FX rates saved to database');
    },
    
    /**
     * Load live rates from database
     */
    loadLiveRatesFromDatabase: async function() {
        if (typeof Database === 'undefined') {
            return null;
        }
        
        const data = Database.getData();
        
        if (data.fxRates && data.fxRates.live) {
            console.log('Loaded live rates from database');
            return {
                base: data.fxRates.live.base,
                rates: data.fxRates.live.rates,
                date: data.fxRates.live.date,
                fetchedAt: data.fxRates.live.fetchedAt
            };
        }
        
        return null;
    },
    
    /**
     * Save ALL rates for a specific date to database
     */
    saveAllRatesForDateToDatabase: async function(date, ratesData) {
        if (typeof Database === 'undefined') {
            return;
        }
        
        const data = Database.getData();
        
        if (!data.fxRates) {
            data.fxRates = {};
        }
        
        // Store complete rates object for the date
        data.fxRates[date] = ratesData;
        
        await Database.saveToDrive();
        console.log(`✅ ALL FX rates saved for ${date}`);
    },
    
    /**
     * Get ALL rates for a specific date from database
     */
    getAllRatesForDateFromDatabase: async function(date) {
        if (typeof Database === 'undefined') {
            return null;
        }
        
        const data = Database.getData();
        
        if (!data.fxRates || !data.fxRates[date]) {
            return null;
        }
        
        return data.fxRates[date];
    },
    
    /**
     * Get closest available date's rates
     */
    getClosestDateRates: async function(targetDate) {
        if (typeof Database === 'undefined') {
            return null;
        }
        
        const data = Database.getData();
        
        if (!data.fxRates) {
            return null;
        }
        
        // Get all dates we have rates for (exclude 'live')
        const availableDates = Object.keys(data.fxRates).filter(key => key !== 'live');
        
        if (availableDates.length === 0) {
            return null;
        }
        
        // Find closest date
        let closestDate = null;
        let minDiff = Infinity;
        
        const target = new Date(targetDate).getTime();
        
        availableDates.forEach(date => {
            const diff = Math.abs(new Date(date).getTime() - target);
            if (diff < minDiff) {
                minDiff = diff;
                closestDate = date;
            }
        });
        
        if (closestDate) {
            return {
                date: closestDate,
                rates: data.fxRates[closestDate]
            };
        }
        
        return null;
    },
    
    /**
     * Clear all cached FX data
     */
    clearCache: function() {
        this.liveRatesCache = null;
        this.liveCacheExpiry = null;
        console.log('FX cache cleared');
    }
};