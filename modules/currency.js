// ===================================
// CURRENCY MODULE
// Handles FX rates and currency conversion
// ===================================

const Currency = {
    // Cache for FX rates (avoid repeated API calls)
    rateCache: {},
    
    /**
     * Get FX rate between two currencies for a specific date
     * Returns rate where: fromAmount * rate = toAmount
     */
    getRate: async function(fromCurrency, toCurrency, date = null) {
        // If same currency, rate is 1
        if (fromCurrency === toCurrency) {
            return 1.0;
        }
        
        // Check cache first
        const cacheKey = `${fromCurrency}_${toCurrency}_${date || 'latest'}`;
        if (this.rateCache[cacheKey]) {
            console.log('Using cached FX rate:', cacheKey, this.rateCache[cacheKey]);
            return this.rateCache[cacheKey];
        }
        
        try {
            // Fetch from API
            console.log(`Fetching FX rate: ${fromCurrency} -> ${toCurrency} for ${date || 'today'}`);
            
            // Using free exchangerate API
            const url = `${CONFIG.fxApiUrl}${fromCurrency}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('FX API request failed');
            }
            
            const data = await response.json();
            
            if (!data.rates || !data.rates[toCurrency]) {
                throw new Error(`No rate available for ${toCurrency}`);
            }
            
            const rate = data.rates[toCurrency];
            
            // Cache the result
            this.rateCache[cacheKey] = rate;
            
            console.log(`✅ FX rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
            
            return rate;
            
        } catch (error) {
            console.error('Error fetching FX rate:', error);
            UI.showMessage(`Could not fetch FX rate for ${fromCurrency}/${toCurrency}`, 'error');
            
            // Return null to indicate failure
            return null;
        }
    },
    
    /**
     * Convert amount from one currency to another
     */
    convert: function(amount, fromCurrency, toCurrency, rate) {
        if (fromCurrency === toCurrency) {
            return amount;
        }
        
        if (!rate) {
            console.error('No FX rate provided for conversion');
            return amount; // Return original if no rate
        }
        
        return amount * rate;
    },
    
    /**
     * Calculate FX rate from two amounts in different currencies
     * Example: $100 USD = $135 CAD means rate is 1.35
     */
    calculateRateFromAmounts: function(amount1, currency1, amount2, currency2) {
        if (amount1 === 0) {
            console.error('Cannot calculate rate from zero amount');
            return null;
        }
        
        // Rate = amount2 / amount1
        const rate = amount2 / amount1;
        
        console.log(`Calculated FX rate: ${amount1} ${currency1} = ${amount2} ${currency2} (rate: ${rate})`);
        
        return rate;
    },
    
    /**
     * Format currency amount with symbol
     */
    formatAmount: function(amount, currencyCode) {
        // Find currency info
        const currencyInfo = CONFIG.supportedCurrencies.find(c => c.code === currencyCode);
        const symbol = currencyInfo ? currencyInfo.symbol : currencyCode;
        
        // Format with appropriate decimals
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
        
        return `${symbol}${formatted} ${currencyCode}`;
    },
    
    /**
     * Format amount in dual currencies
     * Example: "$150.00 USD ($202.50 CAD)"
     */
    formatDualCurrency: function(amountInOriginal, originalCurrency, amountInBase, baseCurrency) {
        if (originalCurrency === baseCurrency) {
            return this.formatAmount(amountInOriginal, originalCurrency);
        }
        
        return `${this.formatAmount(amountInOriginal, originalCurrency)} (${this.formatAmount(amountInBase, baseCurrency)})`;
    },
    
    /**
     * Get currency symbol
     */
    getSymbol: function(currencyCode) {
        const currencyInfo = CONFIG.supportedCurrencies.find(c => c.code === currencyCode);
        return currencyInfo ? currencyInfo.symbol : currencyCode;
    },
    
    /**
     * Get currency name
     */
    getName: function(currencyCode) {
        const currencyInfo = CONFIG.supportedCurrencies.find(c => c.code === currencyCode);
        return currencyInfo ? currencyInfo.name : currencyCode;
    },
    
    /**
     * Clear rate cache (useful for refresh)
     */
    clearCache: function() {
        this.rateCache = {};
        console.log('FX rate cache cleared');
    }
};