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
     * Calculate portfolio statistics
     * All totals in base currency
     */
    calculateStats: function(data, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        const stats = {
            totalValue: 0,
            totalInvested: 0,
            totalPositions: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            baseCurrency: baseCurrency
        };
        
        if (!data || !data.transactions || data.transactions.length === 0) {
            return stats;
        }
        
        const holdings = this.calculateHoldings(data.transactions, baseCurrency);
        
        // Count positions
        stats.totalPositions = holdings.length;
        
        // Sum total invested (in base currency)
        stats.totalInvested = holdings.reduce((sum, h) => sum + h.totalCostInBase, 0);
        
        // For total value, we'd need current market prices
        // For now, use total cost as placeholder
        // TODO: Integrate with stock price API
        stats.totalValue = stats.totalInvested;
        
        // Calculate gain/loss
        stats.totalGainLoss = stats.totalValue - stats.totalInvested;
        stats.totalGainLossPercent = stats.totalInvested > 0 
            ? (stats.totalGainLoss / stats.totalInvested) * 100 
            : 0;
        
        return stats;
    },
    
    /**
     * Calculate holdings by account
     */
    getHoldingsByAccount: function(transactions, accountId, baseCurrency = null) {
        const accountTransactions = transactions.filter(t => t.accountId === accountId);
        return this.calculateHoldings(accountTransactions, baseCurrency);
    },
    
    /**
     * Get all unique symbols in portfolio
     */
    getAllSymbols: function(transactions) {
        if (!transactions || transactions.length === 0) {
            return [];
        }
        
        const symbols = new Set();
        transactions.forEach(txn => {
            symbols.add(txn.symbol);
        });
        
        return Array.from(symbols);
    },
    
    /**
     * Get transaction history for a specific symbol
     */
    getSymbolHistory: function(transactions, symbol) {
        return transactions.filter(t => t.symbol === symbol);
    },
    
    /**
     * Calculate total fees paid (in base currency)
     */
    getTotalFees: function(transactions, baseCurrency = null) {
        if (!transactions || transactions.length === 0) {
            return 0;
        }
        
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        return transactions.reduce((sum, txn) => {
            const feesInBase = txn.feesInBase || txn.fees || 0;
            return sum + feesInBase;
        }, 0);
    },
    
    /**
     * Get account summary
     */
    getAccountSummary: function(data, accountId, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        const accountTxns = data.transactions.filter(t => t.accountId === accountId);
        const holdings = this.calculateHoldings(accountTxns, baseCurrency);
        
        return {
            accountId: accountId,
            accountName: data.accounts[accountId]?.name || accountId,
            accountCurrency: data.accounts[accountId]?.defaultCurrency || baseCurrency,
            totalPositions: holdings.length,
            totalInvested: holdings.reduce((sum, h) => sum + h.totalCostInBase, 0),
            totalFees: this.getTotalFees(accountTxns, baseCurrency),
            baseCurrency: baseCurrency,
            holdings: holdings
        };
    },
    
    /**
     * Get performance by symbol
     * Note: Requires current market prices to calculate actual performance
     */
    getSymbolPerformance: function(transactions, symbol, currentPrice, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        const symbolTxns = this.getSymbolHistory(transactions, symbol);
        const holdings = this.calculateHoldings(symbolTxns, baseCurrency);
        
        if (holdings.length === 0) {
            return null;
        }
        
        const holding = holdings[0];
        
        const performance = {
            symbol: symbol,
            quantity: holding.quantity,
            avgCost: holding.avgCost,
            avgCostInBase: holding.avgCostInBase,
            totalCost: holding.totalCost,
            totalCostInBase: holding.totalCostInBase,
            currency: holding.currency,
            baseCurrency: baseCurrency,
            currentPrice: currentPrice || null,
            currentValue: null,
            currentValueInBase: null,
            gainLoss: null,
            gainLossPercent: null
        };
        
        if (currentPrice) {
            performance.currentValue = holding.quantity * currentPrice;
            // TODO: Convert current value to base currency using current FX rate
            performance.currentValueInBase = performance.currentValue; // Placeholder
            performance.gainLoss = performance.currentValueInBase - holding.totalCostInBase;
            performance.gainLossPercent = (performance.gainLoss / holding.totalCostInBase) * 100;
        }
        
        return performance;
    },
    
    /**
     * Get summary of buy vs sell transactions
     */
    getTransactionSummary: function(transactions, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        const summary = {
            totalBuys: 0,
            totalSells: 0,
            totalBuyValue: 0,
            totalSellValue: 0,
            totalFees: 0,
            baseCurrency: baseCurrency
        };
        
        if (!transactions || transactions.length === 0) {
            return summary;
        }
        
        transactions.forEach(txn => {
            const totalInBase = txn.totalInBase || txn.total;
            const feesInBase = txn.feesInBase || txn.fees || 0;
            
            if (txn.type === 'buy') {
                summary.totalBuys++;
                summary.totalBuyValue += totalInBase;
            } else if (txn.type === 'sell') {
                summary.totalSells++;
                summary.totalSellValue += totalInBase;
            }
            
            summary.totalFees += feesInBase;
        });
        
        return summary;
    },
    
    /**
     * Get diversification breakdown
     * Shows percentage of portfolio each holding represents
     */
    getDiversification: function(transactions, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        const holdings = this.calculateHoldings(transactions, baseCurrency);
        
        if (holdings.length === 0) {
            return [];
        }
        
        const totalValue = holdings.reduce((sum, h) => sum + h.totalCostInBase, 0);
        
        return holdings.map(h => ({
            symbol: h.symbol,
            company: h.company,
            value: h.totalCostInBase,
            percentage: (h.totalCostInBase / totalValue) * 100,
            baseCurrency: baseCurrency
        })).sort((a, b) => b.percentage - a.percentage);
    },
    
    /**
     * Get monthly transaction summary
     * Groups transactions by month (in base currency)
     */
    getMonthlyActivity: function(transactions, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        if (!transactions || transactions.length === 0) {
            return [];
        }
        
        const byMonth = {};
        
        transactions.forEach(txn => {
            // Extract year-month from date (e.g., "2024-01")
            const month = txn.date.substring(0, 7);
            
            if (!byMonth[month]) {
                byMonth[month] = {
                    month: month,
                    buys: 0,
                    sells: 0,
                    totalBuyValue: 0,
                    totalSellValue: 0,
                    baseCurrency: baseCurrency
                };
            }
            
            const totalInBase = txn.totalInBase || txn.total;
            
            if (txn.type === 'buy') {
                byMonth[month].buys++;
                byMonth[month].totalBuyValue += totalInBase;
            } else if (txn.type === 'sell') {
                byMonth[month].sells++;
                byMonth[month].totalSellValue += totalInBase;
            }
        });
        
        // Convert to array and sort by month
        return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
    },
    
    /**
     * Get currency breakdown
     * Shows how much is invested in each currency
     */
    getCurrencyBreakdown: function(transactions) {
        if (!transactions || transactions.length === 0) {
            return [];
        }
        
        const byCurrency = {};
        
        transactions.forEach(txn => {
            const currency = txn.currency || 'USD';
            
            if (!byCurrency[currency]) {
                byCurrency[currency] = {
                    currency: currency,
                    totalInvested: 0,
                    transactions: 0
                };
            }
            
            if (txn.type === 'buy') {
                byCurrency[currency].totalInvested += txn.total;
                byCurrency[currency].transactions++;
            }
        });
        
        return Object.values(byCurrency).sort((a, b) => b.totalInvested - a.totalInvested);
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
        return years || 0.01; // Avoid division by zero, minimum 0.01 years
    },
    
    /**
     * Calculate P/L and ARR for a single holding
     */
    calculateHoldingPerformance: function(holding, currentPrice, baseCurrency = null) {
        if (!baseCurrency) {
            baseCurrency = CONFIG.baseCurrency;
        }
        
        if (!currentPrice) {
            return {
                currentPrice: null,
                currentValue: null,
                currentValueInBase: null,
                gainLoss: null,
                gainLossPercent: null,
                arr: null
            };
        }
        
        // Calculate current value
        const currentValue = holding.quantity * currentPrice;
        
        // For simplicity, assume current price is in same currency as holding
        // In production, would need FX conversion here
        const currentValueInBase = currentValue;
        
        // Calculate P/L
        const gainLoss = currentValueInBase - holding.totalCostInBase;
        const gainLossPercent = (gainLoss / holding.totalCostInBase) * 100;
        
        // Calculate ARR
        // Find earliest transaction date for this holding
        const firstDate = holding.transactions.reduce((earliest, txn) => {
            return txn.date < earliest ? txn.date : earliest;
        }, holding.transactions[0].date);
        
        const yearsHeld = this.calculateYearsHeld(firstDate);
        const arr = (gainLoss / holding.totalCostInBase / yearsHeld) * 100;
        
        return {
            currentPrice: currentPrice,
            currentValue: currentValue,
            currentValueInBase: currentValueInBase,
            gainLoss: gainLoss,
            gainLossPercent: gainLossPercent,
            arr: arr,
            yearsHeld: yearsHeld
        };
    },
    
    /**
     * Calculate portfolio-level statistics with current prices
     */
    calculatePortfolioStats: function(data, baseCurrency = null) {
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
        
        // Get holdings
        const holdings = this.calculateHoldings(data.transactions, baseCurrency);
        
        // Calculate performance for each holding
        let totalWeightedARR = 0;
        
        holdings.forEach(holding => {
            const currentPrice = Prices.getCurrentPrice(holding.symbol);
            const performance = this.calculateHoldingPerformance(holding, currentPrice, baseCurrency);
            
            // Add performance data to holding
            holding.performance = performance;
            
            // Sum up totals
            stats.totalInvested += holding.totalCostInBase;
            
            if (performance.currentValueInBase !== null) {
                stats.totalCurrentValue += performance.currentValueInBase;
                
                // Weighted ARR by investment amount
                if (performance.arr !== null) {
                    totalWeightedARR += performance.arr * holding.totalCostInBase;
                }
            } else {
                // If no current price, use cost as current value
                stats.totalCurrentValue += holding.totalCostInBase;
            }
            
            stats.holdings.push(holding);
        });
        
        // Calculate total P/L
        stats.totalGainLoss = stats.totalCurrentValue - stats.totalInvested;
        stats.totalGainLossPercent = stats.totalInvested > 0 
            ? (stats.totalGainLoss / stats.totalInvested) * 100 
            : 0;
        
        // Calculate weighted average ARR
        stats.totalARR = stats.totalInvested > 0 
            ? totalWeightedARR / stats.totalInvested 
            : 0;
        
        return stats;
    },
};