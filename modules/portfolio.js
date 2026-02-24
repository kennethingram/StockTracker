// ===================================
// PORTFOLIO MODULE
// Calculates holdings, positions, statistics
// NOW WITH MULTI-CURRENCY SUPPORT
// ===================================

const Portfolio = {
    
    /**
     * Calculate current holdings from transactions
     * Groups by symbol and calculates average cost
     * Returns values in BOTH original currency AND base currency
     */
    calculateHoldings: function(transactions, baseCurrency = null) {
        if (!transactions || transactions.length === 0) {
            return [];
        }
        
        // Use config base currency if not provided
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        // Group transactions by symbol
        const holdingsBySymbol = {};
        
        transactions.forEach(txn => {
            const symbol = txn.symbol;
            
            if (!holdingsBySymbol[symbol]) {
                holdingsBySymbol[symbol] = {
                    symbol: symbol,
                    company: txn.company || symbol,
                    quantity: 0,
                    totalCost: 0,              // In original currency
                    totalCostInBase: 0,        // In base currency
                    currency: txn.currency,     // Original transaction currency
                    baseCurrency: baseCurrency,
                    accountId: txn.accountId,
                    transactions: []
                };
            }
            
            const holding = holdingsBySymbol[symbol];
            
            // Add or subtract quantity based on buy/sell
            if (txn.type === 'buy') {
                holding.quantity += txn.quantity;
                holding.totalCost += txn.total; // In original currency
                holding.totalCostInBase += (txn.totalInBase || txn.total); // In base currency
            } else if (txn.type === 'sell') {
                holding.quantity -= txn.quantity;
                // For sells, reduce total cost proportionally
                const avgCost = holding.totalCost / (holding.quantity + txn.quantity);
                const avgCostInBase = holding.totalCostInBase / (holding.quantity + txn.quantity);
                holding.totalCost -= (avgCost * txn.quantity);
                holding.totalCostInBase -= (avgCostInBase * txn.quantity);
            }
            
            holding.transactions.push(txn);
        });
        
        // Convert to array and calculate average cost
        const holdings = Object.values(holdingsBySymbol)
            .filter(h => h.quantity > 0) // Only show positions we still hold
            .map(h => {
                h.avgCost = h.totalCost / h.quantity;
                h.avgCostInBase = h.totalCostInBase / h.quantity;
                return h;
            });
        
        return holdings;
    },
    /**
     * Calculate years held from a date to today
     */
    calculateYearsHeld: function(startDate) {
        const start = new Date(startDate);
        const today = new Date();
        const diffTime = Math.abs(today - start);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const years = diffDays / 365.25;
        return years || 0.01;
    },
    
    /**
     * Calculate total cost basis in a target currency using historical FX rates.
     * Each buy transaction is converted at the rate on its own date.
     * Sell transactions reduce cost proportionally.
     * Cost basis never uses live FX rates.
     */
    calculateCostBasisInCurrency: async function(transactions, targetCurrency) {
        let quantity = 0;
        let totalCost = 0;

        for (const txn of transactions) {
            if (txn.type === 'buy') {
                let costInTarget;
                if (txn.currency === targetCurrency) {
                    costInTarget = txn.total;
                } else if (typeof FX !== 'undefined') {
                    costInTarget = await FX.convertWithHistoricalRate(
                        txn.total,
                        txn.currency,
                        targetCurrency,
                        txn.date
                    );
                } else {
                    costInTarget = txn.totalInBase || txn.total;
                }
                quantity += txn.quantity;
                totalCost += costInTarget;
            } else if (txn.type === 'sell') {
                const avgCost = quantity > 0 ? totalCost / quantity : 0;
                quantity -= txn.quantity;
                totalCost -= avgCost * txn.quantity;
            }
        }

        return Math.max(totalCost, 0);
    },

    /**
     * Calculate P/L and ARR for a single holding
     * currentPriceData can be a number or { price, currency } object
     * Uses FX conversion for current value
     */
    calculateHoldingPerformance: async function(holding, currentPriceData, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        if (!currentPriceData) {
            return {
                currentPrice: null,
                priceCurrency: null,
                currentValue: null,
                currentValueInBase: null,
                gainLoss: null,
                gainLossPercent: null,
                arr: null
            };
        }
        
        // Handle both number and { price, currency } object formats
        let currentPrice, priceCurrency, priceStale, priceAsOf;
        if (typeof currentPriceData === 'object' && currentPriceData !== null) {
            currentPrice = currentPriceData.price;
            priceCurrency = currentPriceData.currency || holding.currency;
            priceStale = currentPriceData.stale || false;
            priceAsOf = currentPriceData.asOf || null;
        } else {
            currentPrice = currentPriceData;
            priceCurrency = holding.currency;
            priceStale = false;
            priceAsOf = null;
        }
        
        // Calculate current value in native currency
        const currentValue = holding.quantity * currentPrice;
        
        // Convert current price to base currency for display
        let currentPriceInBase = currentPrice;
        if (priceCurrency !== baseCurrency && typeof FX !== 'undefined') {
            try {
                currentPriceInBase = await FX.convertCurrency(currentPrice, priceCurrency, baseCurrency);
            } catch (error) {
                console.error('FX conversion failed for price:', error);
                currentPriceInBase = currentPrice;
            }
        }
        
        // Convert current value to base currency using live FX rate
        let currentValueInBase = currentValue;
        
        if (priceCurrency !== baseCurrency && typeof FX !== 'undefined') {
            try {
                currentValueInBase = await FX.convertCurrency(currentValue, priceCurrency, baseCurrency);
                console.log(`Converted ${currentValue} ${priceCurrency} → ${currentValueInBase.toFixed(2)} ${baseCurrency}`);
            } catch (error) {
                console.error('FX conversion failed, using 1:1:', error);
                currentValueInBase = currentValue;
            }
        }
        
        // Calculate Average Cost Basis (ACB) in base currency
        const acb = holding.totalCostInBase / holding.quantity;
        
        // Calculate P/L
        const gainLoss = currentValueInBase - holding.totalCostInBase;
        const gainLossPercent = (gainLoss / holding.totalCostInBase) * 100;
        
        // Calculate ARR
        const firstDate = holding.transactions.reduce((earliest, txn) => {
            return txn.date < earliest ? txn.date : earliest;
        }, holding.transactions[0].date);
        
        const yearsHeld = this.calculateYearsHeld(firstDate);
        const arr = (gainLoss / holding.totalCostInBase / yearsHeld) * 100;
        
        return {
            currentPrice: currentPrice,
            priceCurrency: priceCurrency,
            priceStale: priceStale,
            priceAsOf: priceAsOf,
            currentPriceInBase: currentPriceInBase,
            currentValue: currentValue,
            currentValueInBase: currentValueInBase,
            acb: acb,
            gainLoss: gainLoss,
            gainLossPercent: gainLossPercent,
            arr: arr,
            yearsHeld: yearsHeld
        };
    },
    
    /**
     * Calculate portfolio-level statistics with current prices
     */
    calculatePortfolioStats: async function(data, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        const stats = {
            totalInvested: 0,
            totalCurrentValue: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            totalARR: 0,
            baseCurrency: baseCurrency,
            holdings: []
        };
        
        if (!data || !data.transactions || data.transactions.length === 0) {
            return stats;
        }
        
        // Get current holdings only (quantity > 0)
        const holdings = this.calculateHoldings(data.transactions, baseCurrency);
        
        let totalWeightedARR = 0;
        
        // Process holdings in parallel
        const holdingPromises = holdings.map(async (holding) => {
            // Get exchange — scan all transactions, not just first (first may lack exchange field)
            const exchange = holding.transactions.find(t => t.exchange)?.exchange || null;
            
            // Fetch price - returns { price, currency } object
            const currentPriceData = await Prices.getCurrentPrice(holding.symbol, exchange);
            const performance = await this.calculateHoldingPerformance(holding, currentPriceData, baseCurrency);
            
            holding.performance = performance;
            
            // Calculate cost basis in display currency using historical FX rates per transaction.
            // This ensures cost basis never uses live FX rates.
            try {
                holding.costBasisConverted = await this.calculateCostBasisInCurrency(
                    holding.transactions,
                    baseCurrency
                );
                console.log(`Historical cost basis for ${holding.symbol}: ${holding.costBasisConverted.toFixed(2)} ${baseCurrency}`);
            } catch (error) {
                console.error('Failed to calculate historical cost basis:', error);
                holding.costBasisConverted = holding.totalCostInBase;
            }

            // Recalculate P/L and ARR using the historically-correct cost basis
            if (performance.currentValueInBase !== null) {
                performance.gainLoss = performance.currentValueInBase - holding.costBasisConverted;
                performance.gainLossPercent = (performance.gainLoss / holding.costBasisConverted) * 100;

                const firstDate = holding.transactions.reduce((earliest, txn) => {
                    return txn.date < earliest ? txn.date : earliest;
                }, holding.transactions[0].date);
                const yearsHeld = this.calculateYearsHeld(firstDate);
                performance.arr = (performance.gainLoss / holding.costBasisConverted / yearsHeld) * 100;
            }
            
            return holding;
        });
        
        const holdingsWithPrices = await Promise.all(holdingPromises);
        
        holdingsWithPrices.forEach(holding => {
            const performance = holding.performance;
            
            // Use converted cost basis if available, otherwise use base
            const costBasis = (holding.costBasisConverted !== undefined ? holding.costBasisConverted : holding.totalCostInBase);
            
            stats.totalInvested += costBasis;
            
            if (performance.currentValueInBase !== null) {
                stats.totalCurrentValue += performance.currentValueInBase;
                
                if (performance.arr !== null) {
                    totalWeightedARR += performance.arr * costBasis;
                }
            } else {
                stats.totalCurrentValue += costBasis;
            }
            
            stats.holdings.push(holding);
        });
        
        stats.totalGainLoss = stats.totalCurrentValue - stats.totalInvested;
        stats.totalGainLossPercent = stats.totalInvested > 0 
            ? (stats.totalGainLoss / stats.totalInvested) * 100 
            : 0;
        
        stats.totalARR = stats.totalInvested > 0 
            ? totalWeightedARR / stats.totalInvested 
            : 0;
        
        return stats;
    },
};