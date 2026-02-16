// ===================================
// PRICES MODULE
// Handles stock price data
// Currently using MOCK prices for testing
// ===================================

const Prices = {
    
    // Mock current prices (for testing)
    // In production, this would fetch from an API
    mockPrices: {
        // US Stocks
        'AAPL': 195.50,      // Up from avg 185.50
        'MSFT': 420.00,      // Up from avg 402.30
        'GOOGL': 148.50,     // Up from avg 142.80
        'AMZN': 178.25,
        'META': 485.30,
        'TSLA': 208.75,
        'NVDA': 722.50,
        
        // Canadian Stocks
        'TD': 82.00,         // Up from avg 78.50
        'TD.TO': 82.00,      // Same as TD
        'SHOP': 88.00,       // Down from avg 95.20
        'SHOP.TO': 88.00,    // Same as SHOP
        'RY': 142.50,
        'RY.TO': 142.50,
        'ENB': 52.30,
        'ENB.TO': 52.30,
        
        // UK Stocks
        'LLOY.L': 55.20,
        'BP.L': 520.50,
        'HSBA.L': 645.80,
        
        // Default for unknown symbols
        'DEFAULT': 100.00
    },
    
    /**
     * Get current price for a symbol
     * Returns mock price or null
     */
    getCurrentPrice: function(symbol) {
        if (!symbol) return null;
        
        // Try exact match first
        if (this.mockPrices[symbol]) {
            return this.mockPrices[symbol];
        }
        
        // Try uppercase
        const upperSymbol = symbol.toUpperCase();
        if (this.mockPrices[upperSymbol]) {
            return this.mockPrices[upperSymbol];
        }
        
        // Return null if not found (rather than default)
        // This lets UI show "Price N/A" instead of wrong price
        console.warn(`No mock price for symbol: ${symbol}`);
        return null;
    },
    
    /**
     * Get prices for multiple symbols
     * Returns object with symbol: price pairs
     */
    getPrices: function(symbols) {
        const prices = {};
        
        symbols.forEach(symbol => {
            prices[symbol] = this.getCurrentPrice(symbol);
        });
        
        return prices;
    },
    
    /**
     * Add or update a mock price
     * Useful for testing
     */
    setMockPrice: function(symbol, price) {
        this.mockPrices[symbol] = price;
        console.log(`Mock price set: ${symbol} = ${price}`);
    },
    
    /**
     * Check if price data is available for symbol
     */
    hasPriceData: function(symbol) {
        return this.getCurrentPrice(symbol) !== null;
    }
};