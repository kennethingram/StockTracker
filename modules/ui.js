// ===================================
// UI MODULE
// Handles all user interface updates
// Navigation, view switching, rendering data
// ===================================

const UI = {
    // Track current active view
    currentView: 'overview',
    
    // Track current editing account
    editingAccountId: null,
    
    // Shared filter state — same filters applied across Overview, Holdings, Transactions
    activeFilters: { accounts: [], holders: [] },

    // Portfolio stats cache — invalidated on price refresh or transaction change
    _statsCache: null,
    _statsCacheKey: null,
    _statsCacheVersion: 0,

    // Auto-scan throttle for Sync page
    _lastSyncScan: 0,
    
    // Track current favorite being saved
    savingFavoriteForView: null,
    
    // Track selected currency for Overview (session only)
    selectedOverviewCurrency: CONFIG.baseCurrency,

    // Track selected currency for Holdings (session only)
    selectedHoldingsCurrency: CONFIG.baseCurrency,

    
    /**
     * Initialize the UI module
     * Set up navigation, event listeners
     */
     init: function() {
        console.log('UI module initializing...');

        // Load user-saved reporting currency preference
        const savedCurrency = localStorage.getItem('baseCurrency');
        if (savedCurrency) {
            CONFIG.baseCurrency = savedCurrency;
            this.selectedOverviewCurrency = savedCurrency;
        }

        // Initialize auth module first
        if (typeof Auth !== 'undefined') {
            Auth.init();
        }

        // Set up navigation buttons
        this.setupNavigation();
        
        // Set up sync view buttons
        this.setupSyncButtons();
        
        // Set up account management buttons
        this.setupAccountButtons();
        
        // Populate form dropdowns
        this.populateFormDropdowns();

        // Initialize filters (will be populated when data loads)
        this.initializeFilters();

    },
    
    /**
     * Set up navigation between views
     * Overview, Holdings, Transactions, Sync
     */
     setupNavigation: function() {
        // Desktop pill tab buttons
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const viewName = e.target.getAttribute('data-view');
                this.switchView(viewName);
            });
        });

        // Mobile hamburger sidebar
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const sidebarEl = document.getElementById('nav-sidebar');
        const overlayEl = document.getElementById('nav-sidebar-overlay');
        const closeBtn = document.getElementById('sidebar-close-btn');

        const openSidebar = () => {
            sidebarEl.classList.add('open');
            overlayEl.classList.add('open');
        };
        const closeSidebar = () => {
            sidebarEl.classList.remove('open');
            overlayEl.classList.remove('open');
        };

        if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
        if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
        if (overlayEl) overlayEl.addEventListener('click', closeSidebar);

        document.querySelectorAll('.nav-sidebar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.getAttribute('data-view'));
                closeSidebar();
            });
        });

        const sidebarSignout = document.getElementById('sidebar-signout-btn');
        if (sidebarSignout) sidebarSignout.addEventListener('click', () => Auth.signOut());

        // Profile dropdown
        const profileAvatarBtn = document.getElementById('profile-avatar-btn');
        const profileSignoutBtn = document.getElementById('profile-signout-btn');

        if (profileAvatarBtn) {
            profileAvatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProfileMenu();
            });
        }

        if (profileSignoutBtn) {
            profileSignoutBtn.addEventListener('click', () => {
                this.closeProfileMenu();
                Auth.signOut();
            });
        }

        // Close profile dropdown on outside click
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('profile-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                this.closeProfileMenu();
            }
        });
    },

    toggleProfileMenu: function() {
        const dropdown = document.getElementById('profile-dropdown');
        const btn = document.getElementById('profile-avatar-btn');
        if (!dropdown) return;
        const isOpen = dropdown.classList.toggle('open');
        if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    },

    closeProfileMenu: function() {
        const dropdown = document.getElementById('profile-dropdown');
        const btn = document.getElementById('profile-avatar-btn');
        if (dropdown) dropdown.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    },

    /**
     * Switch between different views in the dashboard
     */
     switchView: function(viewName) {
        console.log('Switching to view:', viewName);

        // Update current view
        this.currentView = viewName;

        // Update desktop pill nav active state
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update mobile sidebar active state
        document.querySelectorAll('.nav-sidebar-btn').forEach(btn => btn.classList.remove('active'));
        const activeSidebarBtn = document.querySelector(`.nav-sidebar-btn[data-view="${viewName}"]`);
        if (activeSidebarBtn) activeSidebarBtn.classList.add('active');

        // Hide all views, show selected
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const activeView = document.getElementById(`${viewName}-view`);
        if (activeView) activeView.classList.add('active');

        // Load data for the view
        this.loadViewData(viewName);
    },
    
    /**
     * Populate filter popover checkboxes for a view
     */
     populateFilters: function(viewName) {
        if (typeof Database === 'undefined') return;
        const data = Database.getData();
        if (!data) return;

        const accounts = Object.values(data.accounts || {});
        const holders = [...new Set(accounts.flatMap(a => a.holders || []))].sort();

        // Account checkboxes
        const fpAcc = document.getElementById(`${viewName}-fp-accounts`);
        if (fpAcc) {
            if (accounts.length === 0) {
                fpAcc.innerHTML = '<span class="filter-pop-empty">No accounts</span>';
            } else {
                fpAcc.innerHTML = accounts.map(acc => {
                    const checked = this.activeFilters.accounts.includes(acc.id) ? 'checked' : '';
                    const dot = acc.isActive ? '🟢' : '⚫';
                    return `<label class="filter-pop-item">
                        <input type="checkbox" ${checked}
                            onchange="UI.onFilterCheckboxChange('${viewName}','accounts','${acc.id}',this.checked)">
                        ${dot} ${acc.name}
                    </label>`;
                }).join('');
            }
        }

        // Holder checkboxes
        const fpHol = document.getElementById(`${viewName}-fp-holders`);
        if (fpHol) {
            if (holders.length === 0) {
                fpHol.innerHTML = '<span class="filter-pop-empty">No holders</span>';
            } else {
                fpHol.innerHTML = holders.map(h => {
                    const checked = this.activeFilters.holders.includes(h) ? 'checked' : '';
                    return `<label class="filter-pop-item">
                        <input type="checkbox" ${checked}
                            onchange="UI.onFilterCheckboxChange('${viewName}','holders','${h}',this.checked)">
                        ${h}
                    </label>`;
                }).join('');
            }
        }

        // Sync chips + badge
        this.renderFilterChips(viewName);
    },

    /**
     * Toggle filter popover open/closed
     */
    toggleFilterPopover: function(viewName) {
        const pop = document.getElementById(`${viewName}-filter-popover`);
        const btn = document.getElementById(`${viewName}-filter-btn`);
        if (!pop) return;
        const opening = !pop.classList.contains('open');
        // Close all popovers first
        ['overview', 'holdings', 'transactions'].forEach(v => {
            const p = document.getElementById(`${v}-filter-popover`);
            const b = document.getElementById(`${v}-filter-btn`);
            if (p) p.classList.remove('open');
            if (b) b.classList.remove('active');
        });
        if (opening) {
            pop.classList.add('open');
            if (btn) btn.classList.add('active');
        }
    },

    /**
     * Handle filter checkbox change
     */
    onFilterCheckboxChange: function(viewName, filterType, value, checked) {
        const arr = this.activeFilters[filterType];
        if (checked) {
            if (!arr.includes(value)) arr.push(value);
        } else {
            const idx = arr.indexOf(value);
            if (idx >= 0) arr.splice(idx, 1);
        }
        this.renderFilterChips(viewName);
        this.loadViewData(viewName);
    },

    /**
     * Remove a single active filter chip
     */
    removeFilter: function(filterType, value) {
        const arr = this.activeFilters[filterType];
        const idx = arr.indexOf(value);
        if (idx >= 0) arr.splice(idx, 1);
        // Uncheck the corresponding checkbox in any open popover
        ['overview', 'holdings', 'transactions'].forEach(v => {
            const pop = document.getElementById(`${v}-filter-popover`);
            if (!pop) return;
            pop.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const parent = cb.closest('label');
                if (parent) {
                    const onChange = cb.getAttribute('onchange') || '';
                    if (onChange.includes(`'${filterType}'`) && onChange.includes(`'${value}'`)) {
                        cb.checked = false;
                    }
                }
            });
            this.renderFilterChips(v);
        });
        this.loadViewData(this.currentView);
    },

    /**
     * Render active filter chips for a view
     */
    renderFilterChips: function(viewName) {
        const chipsEl = document.getElementById(`${viewName}-filter-chips`);
        if (!chipsEl) return;

        const data = (typeof Database !== 'undefined') ? Database.getData() : null;
        let html = '';

        this.activeFilters.accounts.forEach(accId => {
            const acc = data && data.accounts ? data.accounts[accId] : null;
            const label = acc ? acc.name : accId;
            html += `<span class="filter-chip">${label}<button class="filter-chip-remove" onclick="UI.removeFilter('accounts','${accId}')" aria-label="Remove">×</button></span>`;
        });

        this.activeFilters.holders.forEach(holder => {
            html += `<span class="filter-chip">${holder}<button class="filter-chip-remove" onclick="UI.removeFilter('holders','${holder}')" aria-label="Remove">×</button></span>`;
        });

        chipsEl.innerHTML = html;
        this.updateFilterBadge(viewName);
    },

    /**
     * Update the active filter count badge on the Filters button
     */
    updateFilterBadge: function(viewName) {
        const badge = document.getElementById(`${viewName}-filter-badge`);
        if (!badge) return;
        const count = this.activeFilters.accounts.length + this.activeFilters.holders.length;
        badge.textContent = count > 0 ? count : '';
    },

    /**
     * Load data for the current view
     */
     loadViewData: function(viewName) {
        // Populate filters for this view first
        this.populateFilters(viewName);
        this.populateFavorites(viewName);
        
        // Then load the view data with current filters
        switch(viewName) {
            case 'overview':
                this.updateOverview();
                break;
            case 'holdings':
                this.updateHoldings();
                break;
            case 'transactions':
                this.updateTransactions();
                break;
            case 'accounts':
                this.updateAccountsView();
                break;
            case 'sync':
                this.updateSyncView();
                break;
            case 'admin':
                this.updateAdminView();
                break;
            case 'help':
                // static content — nothing to load
                break;
        }
    },


    /**
     * Update the Overview view
     * Shows portfolio summary stats
     */
    invalidateStatsCache: function() {
        this._statsCacheVersion++;
        this._statsCache = null;
    },

    _getStats: async function(filteredData, baseCurrency) {
        const key = `${this._statsCacheVersion}|${filteredData.transactions.length}|${baseCurrency}`;
        if (this._statsCache && this._statsCacheKey === key) {
            console.log('Portfolio stats cache hit');
            return this._statsCache;
        }
        const stats = await Portfolio.calculatePortfolioStats(filteredData, baseCurrency);
        this._statsCache = stats;
        this._statsCacheKey = key;
        return stats;
    },

     updateOverview: async function() {
        console.log('Updating overview...');
        
        if (typeof Portfolio === 'undefined' || typeof Database === 'undefined') {
            console.log('Portfolio or Database module not loaded yet');
            return;
        }
        
        const data = Database.getData();
        if (!data) {
            console.log('No data available yet');
            return;
        }
        
        // Get filtered transactions (shared filter state)
        const filteredTxns = this.getFilteredTransactions();
        
        // Create filtered data object
        const filteredData = {
            ...data,
            transactions: filteredTxns
        };
        
        // Use selected currency for Overview
        const baseCurrency = this.selectedOverviewCurrency;
        const currSel = document.getElementById('overview-currency-select');
        if (currSel) currSel.value = baseCurrency;
        
        // Calculate portfolio stats with filtered data and selected currency (cached)
        const stats = await this._getStats(filteredData, baseCurrency);
        
        // Update stat cards
        document.getElementById('total-value').textContent = 
            this.formatCurrency(stats.totalCurrentValue, baseCurrency);
        document.getElementById('value-currency').textContent = 
            baseCurrency;
        
        document.getElementById('total-invested').textContent = 
            this.formatCurrency(stats.totalInvested, baseCurrency);
        document.getElementById('invested-currency').textContent = 
            stats.baseCurrency;
        
        // P/L card with color
        const plElement = document.getElementById('total-pl');
        plElement.textContent = this.formatCurrency(Math.abs(stats.totalGainLoss), baseCurrency);
        
        // Add positive/negative class
        plElement.className = 'stat-value';
        if (stats.totalGainLoss > 0) {
            plElement.classList.add('positive');
            plElement.textContent = '+' + this.formatCurrency(stats.totalGainLoss);
        } else if (stats.totalGainLoss < 0) {
            plElement.classList.add('negative');
            plElement.textContent = '-' + this.formatCurrency(Math.abs(stats.totalGainLoss));
        } else {
            plElement.classList.add('neutral');
        }
        
        // P/L percent
        const plPercentElement = document.getElementById('total-pl-percent');
        const sign = stats.totalGainLossPercent >= 0 ? '+' : '';
        plPercentElement.textContent = sign + stats.totalGainLossPercent.toFixed(2) + '%';
        
        // ARR card
        const arrElement = document.getElementById('total-arr');
        const arrSign = stats.totalARR >= 0 ? '+' : '';
        arrElement.textContent = arrSign + stats.totalARR.toFixed(2) + '%';
        arrElement.className = 'stat-value';
        if (stats.totalARR > 0) {
            arrElement.classList.add('positive');
        } else if (stats.totalARR < 0) {
            arrElement.classList.add('negative');
        } else {
            arrElement.classList.add('neutral');
        }
        
        document.getElementById('total-positions').textContent = 
            stats.holdings.length;
        document.getElementById('total-accounts').textContent = 
            Object.keys(data.accounts || {}).length;
        
        // Update holdings cards (replaces recent transactions)
        this.updateOverviewHoldings(stats.holdings, baseCurrency);
    },
    
    /**
     * Update recent transactions list
     */
     updateRecentTransactions: function(transactions) {
        const listEl = document.getElementById('recent-transactions-list');
        
        if (!transactions || transactions.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No transactions yet. Click "Sync" to process contract notes.</p>';
            return;
        }
        
        // Get last 5 transactions
        const recent = transactions.slice(-5).reverse();
        
        let html = '<table class="data-table">';
        html += '<thead><tr>';
        html += '<th>Date</th><th>Symbol</th><th>Type</th>';
        html += '<th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th>';
        html += '</tr></thead><tbody>';

        recent.forEach(txn => {
            const badgeClass = txn.type === 'buy' ? 'badge-buy' : 'badge-sell';
            html += '<tr>';
            html += `<td class="muted">${txn.date}</td>`;
            html += `<td class="bold">${txn.symbol}</td>`;
            html += `<td><span class="${badgeClass}">${txn.type.toUpperCase()}</span></td>`;
            html += `<td class="right">${txn.quantity}</td>`;
            html += `<td class="right">${this.formatCurrency(txn.price, txn.currency)}</td>`;
            html += `<td class="right bold">${this.formatCurrency(txn.total, txn.currency)}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        listEl.innerHTML = html;
    },
    
    
    /**
     * Update holdings in Overview — compact Yahoo Finance style rows
     */
     updateOverviewHoldings: function(holdings, baseCurrency) {
        const listEl = document.getElementById('recent-transactions-list');

        if (!holdings || holdings.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No holdings yet.</p>';
            return;
        }

        // Column header: Symbol | P/L | ARR | Value | QTY | Price | ACB
        let html = `
            <div class="holdings-col-header">
                <span>Symbol</span>
                <span class="right">P/L</span>
                <span class="right">ARR</span>
                <span class="right">Value (${baseCurrency})</span>
                <span class="right">QTY</span>
                <span class="right">Price</span>
                <span class="right">ACB (${baseCurrency})</span>
            </div>
        `;

        holdings.forEach(holding => {
            const perf = holding.performance;
            const hasPerformanceData = perf && perf.currentPrice !== null && perf.currentPrice !== undefined;
            const missingHistoricalFX = holding.transactions.some(t =>
                t.fxRateSource === 'fallback' ||
                (t.currency !== baseCurrency && !t.fxRate)
            );
            const priceCurrency = (perf && perf.priceCurrency) || holding.currency;

            let plClass = 'neutral', plSign = '';
            if (perf && perf.gainLoss !== null) {
                if (perf.gainLoss > 0)      { plClass = 'positive'; plSign = '+'; }
                else if (perf.gainLoss < 0) { plClass = 'negative'; }
            }

            let arrClass = 'neutral', arrSign = '';
            if (perf && perf.arr !== null) {
                if (perf.arr > 0)      { arrClass = 'positive'; arrSign = '+'; }
                else if (perf.arr < 0) { arrClass = 'negative'; }
            }

            const fxAlert = missingHistoricalFX
                ? `<div class="holding-alert holding-alert-fx">⚠ Historical FX missing — cost basis may be inaccurate. Go to Admin → Fix Missing FX Rates</div>` : '';

            const displayValue = hasPerformanceData && perf.currentValueInBase !== null
                ? this.formatCurrency(perf.currentValueInBase, baseCurrency)
                : this.formatCurrency(holding.costBasisConverted !== undefined ? holding.costBasisConverted : holding.totalCostInBase, baseCurrency);

            const costBasis = holding.costBasisConverted ?? holding.totalCostInBase;
            const acb = holding.quantity > 0
                ? this.formatCurrency(costBasis / holding.quantity, baseCurrency)
                : '—';

            html += `
                ${fxAlert}
                <div class="holding-row ${plClass}">
                    <div class="holding-identity">
                        <div class="holding-symbol">${holding.symbol}</div>
                        <div class="holding-company">${holding.company || 'Unknown'}</div>
                    </div>
                    <div class="holding-pl-col ${plClass}">
                        <span class="holding-pl-amount">
                            ${hasPerformanceData && perf.gainLoss !== null
                                ? plSign + this.formatCurrency(Math.abs(perf.gainLoss), baseCurrency)
                                : '—'}
                        </span>
                        <span class="holding-pl-pct">
                            ${hasPerformanceData && perf.gainLossPercent !== null
                                ? plSign + perf.gainLossPercent.toFixed(2) + '%' : ''}
                        </span>
                    </div>
                    <div class="holding-arr-col ${arrClass}">
                        ${hasPerformanceData && perf.arr !== null
                            ? arrSign + perf.arr.toFixed(2) + '%' : '—'}
                    </div>
                    <div class="holding-value">${displayValue}</div>
                    <div class="holding-qty">${holding.quantity.toLocaleString()}</div>
                    <div class="holding-price">
                        ${perf && perf.currentPrice
                            ? this.formatCurrency(perf.currentPrice, priceCurrency) +
                              `<span class="holding-price-currency">${priceCurrency}</span>` +
                              (perf.priceStale ? `<span class="price-stale-label">Last close</span>` : '')
                            : '<span class="price-not-loaded">— <span class="price-stale-label">refresh to load</span></span>'}
                    </div>
                    <div class="holding-acb">${acb}</div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    },

    /**
     * Change the currency for Overview display
     */
     changeOverviewCurrency: async function(currency) {
        console.log('Changing Overview currency to:', currency);
        
        this.selectedOverviewCurrency = currency;
        
        // Refresh live FX rates
        if (typeof FX !== 'undefined') {
            try {
                await FX.getLiveRates();
            } catch (error) {
                console.error('Failed to refresh FX rates:', error);
            }
        }
        
        // Reload Overview with new currency
        await this.updateOverview();
        
        this.showMessage(`Currency changed to ${currency}`, 'success');
    },

    changeHoldingsCurrency: async function(currency) {
        this.selectedHoldingsCurrency = currency;
        this.invalidateStatsCache();
        await this.updateHoldings();
    },

    onEditAccountChange: function() {
        const accountSelect = document.getElementById('edit-txn-account');
        const brokerField = document.getElementById('edit-txn-broker');
        const accNumField = document.getElementById('edit-txn-account-number');
        if (!accountSelect) return;
        const data = Database.getData();
        const acc = (data.accounts || {})[accountSelect.value];
        if (brokerField) brokerField.value = acc ? (acc.broker || '') : '';
        if (accNumField) accNumField.value = acc ? (acc.accountNumber || '') : '';
    },

    /**
     * Update Holdings view
     * Shows current positions
     */
     updateHoldings: async function() {
        console.log('Updating holdings...');
        
        if (typeof Portfolio === 'undefined' || typeof Database === 'undefined') {
            return;
        }
        
        const data = Database.getData();
        if (!data) return;
        
        // Get filtered transactions (shared filter state)
        const filteredTxns = this.getFilteredTransactions();
        
        // Create filtered data object
        const filteredData = {
            ...data,
            transactions: filteredTxns
        };
        
        const baseCurrency = this.selectedHoldingsCurrency || CONFIG.baseCurrency;
        const stats = await this._getStats(filteredData, baseCurrency);
        const holdings = stats.holdings;

        // Sync currency selector to current value
        const currSel = document.getElementById('holdings-currency-select');
        if (currSel) currSel.value = baseCurrency;

        const listEl = document.getElementById('holdings-list');

        if (holdings.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No holdings yet.</p>';
            return;
        }

        // Column header: Symbol | P/L | ARR | Value | QTY | Price | ACB | Cost
        let html = `
            <div class="holdings-col-header-detail">
                <span>Symbol</span>
                <span class="right">P/L</span>
                <span class="right">ARR</span>
                <span class="right">Value (${baseCurrency})</span>
                <span class="right">QTY</span>
                <span class="right">Price</span>
                <span class="right">ACB (${baseCurrency})</span>
                <span class="right">Cost (${baseCurrency})</span>
            </div>
        `;

        holdings.forEach(holding => {
            const perf = holding.performance || {};
            const priceCurrency = perf.priceCurrency || holding.currency;

            let plClass = 'neutral', plSign = '';
            if (perf.gainLoss > 0)      { plClass = 'positive'; plSign = '+'; }
            else if (perf.gainLoss < 0) { plClass = 'negative'; }

            let arrClass = 'neutral', arrSign = '';
            if (perf.arr > 0)      { arrClass = 'positive'; arrSign = '+'; }
            else if (perf.arr < 0) { arrClass = 'negative'; }

            const priceDisplay = perf && perf.currentPrice
                ? this.formatCurrency(perf.currentPrice, priceCurrency) +
                  `<span class="holding-price-currency">${priceCurrency}</span>` +
                  (perf.priceStale ? `<span class="price-stale-label">Last close</span>` : '')
                : '<span class="price-not-loaded">— <span class="price-stale-label">refresh to load</span></span>';

            const costBasis = holding.costBasisConverted ?? holding.totalCostInBase;
            const acb = holding.quantity > 0
                ? this.formatCurrency(costBasis / holding.quantity, baseCurrency)
                : '—';

            html += `
                <div class="holding-row-detail ${plClass}">
                    <div class="holding-identity">
                        <div class="holding-symbol">${holding.symbol}</div>
                        <div class="holding-company">${holding.company || 'Unknown'}</div>
                    </div>
                    <div class="holding-pl-col ${plClass}">
                        <span class="holding-pl-amount">
                            ${perf.gainLoss !== null && perf.gainLoss !== undefined
                                ? plSign + this.formatCurrency(Math.abs(perf.gainLoss), baseCurrency)
                                : '—'}
                        </span>
                        <span class="holding-pl-pct">
                            ${perf.gainLossPercent !== null && perf.gainLossPercent !== undefined
                                ? plSign + perf.gainLossPercent.toFixed(2) + '%' : ''}
                        </span>
                    </div>
                    <div class="holding-arr-col ${arrClass}">
                        ${perf.arr !== null && perf.arr !== undefined
                            ? arrSign + perf.arr.toFixed(2) + '%' : '—'}
                    </div>
                    <div class="holding-value">
                        ${perf && perf.currentValueInBase
                            ? this.formatCurrency(perf.currentValueInBase, baseCurrency)
                            : '<span style="color:var(--text-muted)">—</span>'}
                    </div>
                    <div class="holding-qty">${holding.quantity.toLocaleString()}</div>
                    <div class="holding-price">${priceDisplay}</div>
                    <div class="holding-acb">${acb}</div>
                    <div class="holding-cost">${this.formatCurrency(costBasis, baseCurrency)}</div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    },
    
    /**
     * Update Transactions view
     * Shows all transactions
     */
     updateTransactions: function() {
        console.log('Updating transactions...');
        
        if (typeof Database === 'undefined') return;
        
        const data = Database.getData();
        if (!data) return;
        
        // Get filtered transactions
        const filteredTxns = this.getFilteredTransactions();
        
        const listEl = document.getElementById('transactions-list');
        
        if (filteredTxns.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No transactions yet.</p>';
            return;
        }
        
        let html = '<table class="data-table">';
        html += '<thead><tr>';
        html += '<th>Date</th>';
        html += '<th>Symbol</th>';
        html += '<th class="col-mob-hide">Exch</th>';
        html += '<th>Type</th>';
        html += '<th class="right">Qty</th>';
        html += '<th class="right col-mob-hide">Price</th>';
        html += '<th class="right col-mob-hide">Fees</th>';
        html += '<th class="right col-mob-hide">Total</th>';
        html += '<th class="right col-mob-only">Cost</th>';
        html += '<th class="col-mob-hide">Account</th>';
        html += '<th></th>';
        html += '</tr></thead><tbody>';

        // Show newest first
        const sorted = [...filteredTxns].reverse();

        const accounts = data.accounts || {};

        sorted.forEach(txn => {
            const badgeClass = txn.type === 'buy' ? 'badge-buy' : 'badge-sell';
            const account = txn.accountId ? accounts[txn.accountId] : null;
            const accountLabel = account ? account.name : (txn.accountId || '—');
            const cost = ((txn.total || 0) + (txn.fees || 0));
            html += '<tr>';
            html += `<td class="muted">${txn.date}</td>`;
            html += `<td class="bold">${txn.symbol}</td>`;
            html += `<td class="muted col-mob-hide">${txn.exchange || '—'}</td>`;
            html += `<td><span class="${badgeClass}">${txn.type.toUpperCase()}</span></td>`;
            html += `<td class="right">${txn.quantity}</td>`;
            html += `<td class="right col-mob-hide">${this.formatCurrency(txn.price, txn.priceCurrency || txn.currency)}</td>`;
            html += `<td class="right muted col-mob-hide">${this.formatCurrency(txn.fees || 0, txn.feesCurrency || txn.currency)}</td>`;
            html += `<td class="right bold col-mob-hide">${this.formatCurrency(txn.total, txn.currency)}</td>`;
            html += `<td class="right bold col-mob-only">${this.formatCurrency(cost, txn.currency)}</td>`;
            html += `<td class="muted col-mob-hide">${accountLabel}</td>`;
            html += `<td><button class="btn-icon" onclick="UI.showEditTransactionModal('${txn.id}')">Edit</button></td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        listEl.innerHTML = html;
    },
    
     /**
     * Update Sync view
     */
     updateSyncView: async function() {
        console.log('Updating sync view...');
        
        // Make sure Drive loads the folder config
        if (typeof Drive !== 'undefined') {
            Drive.loadFolderConfig();
            console.log('Drive folder ID after load:', Drive.contractNotesFolderId);
        }
        
        // Auto-scan for new contract notes (throttled to once per 60 seconds)
        const now = Date.now();
        if (Drive.contractNotesFolderId && (now - this._lastSyncScan > 60000)) {
            this._lastSyncScan = now;
            this.scanForNewFiles();
        } else if (!Drive.contractNotesFolderId) {
            console.log('Sync: no folder set — skipping auto-scan');
        } else {
            console.log('Sync: auto-scan throttled (last scan was < 60s ago)');
        }
    },
    
    // ===================================
    // ADMIN PAGE
    // ===================================

    updateAdminView: function() {
        // Folder name
        if (typeof Drive !== 'undefined') {
            Drive.loadFolderConfig();
            const folderEl = document.getElementById('admin-folder-name');
            if (folderEl) {
                if (Drive.contractNotesFolderId) {
                    Drive.getFolderInfo(Drive.contractNotesFolderId)
                        .then(info => { folderEl.textContent = info.name; })
                        .catch(() => { folderEl.textContent = 'Error loading folder'; });
                } else {
                    folderEl.textContent = 'Not set — click Change Folder';
                }
            }
            const folderBtn = document.getElementById('admin-select-folder-btn');
            if (folderBtn) folderBtn.onclick = () => Drive.selectFolder();
        }

        // Base currency dropdown
        const currSelect = document.getElementById('admin-base-currency');
        if (currSelect) {
            currSelect.innerHTML = '';
            CONFIG.supportedCurrencies.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                if (c.code === CONFIG.baseCurrency) opt.selected = true;
                currSelect.appendChild(opt);
            });
        }

        // Alpha Vantage call counter
        const avEl = document.getElementById('admin-av-calls');
        if (avEl) {
            const stored = localStorage.getItem('av_calls');
            const data = stored ? JSON.parse(stored) : { count: 0 };
            const today = new Date().toDateString();
            avEl.textContent = (data.date === today ? data.count : 0);
        }
    },

    saveBaseCurrency: function() {
        const val = document.getElementById('admin-base-currency').value;
        if (!val) return;
        CONFIG.baseCurrency = val;
        localStorage.setItem('baseCurrency', val);
        this.invalidateStatsCache();
        UI.showMessage(`Reporting currency set to ${val}`, 'success');
    },

    clearPriceCache: function() {
        if (typeof Prices !== 'undefined') Prices.clearCache();
        localStorage.removeItem('av_calls');
        this.invalidateStatsCache();
        UI.showMessage('Price cache cleared', 'success');
        this.updateAdminView();
    },

    /**
     * Backfill fxRate / fxRateSource / base-currency amounts for any
     * transaction that was saved before the FX fields were introduced.
     */
    backfillMissingFXRates: async function() {
        const data = Database.getData();
        const transactions = data.transactions || [];

        const needsFX = transactions.filter(t =>
            t.currency &&
            t.currency !== CONFIG.baseCurrency &&
            (!t.fxRate || t.fxRateSource === 'fallback')
        );

        if (needsFX.length === 0) {
            UI.showMessage('All transactions already have FX rates — nothing to update.', 'info');
            return;
        }

        UI.showLoading(`Fetching FX rates for ${needsFX.length} transaction(s)…`);

        let updated = 0;
        let failed = 0;

        for (const txn of needsFX) {
            try {
                const fxRate = await FX.getHistoricalRate(txn.date, txn.currency, CONFIG.baseCurrency);
                txn.fxRate = fxRate;
                txn.fxRateSource = 'api';
                txn.fxRateDate = txn.date;
                txn.totalInBase = (txn.total || 0) * fxRate;
                txn.priceInBase = (txn.price || 0) * fxRate;
                txn.feesInBase = (txn.fees || 0) * fxRate;
                txn.baseCurrency = CONFIG.baseCurrency;
                updated++;
            } catch (e) {
                console.error(`FX backfill failed for ${txn.symbol} on ${txn.date}:`, e);
                failed++;
            }
        }

        await Database.saveToDrive();
        this.invalidateStatsCache();
        UI.hideLoading();

        if (failed === 0) {
            UI.showMessage(`✅ FX rates updated for ${updated} transaction(s).`, 'success');
        } else {
            UI.showMessage(`Updated ${updated} transaction(s). ${failed} could not be fetched (see console).`, 'warning');
        }
        this.updateOverview();
    },

    exportDatabaseJSON: function() {
        const data = Database.getData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stocktracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    clearAllData: async function() {
        const first = confirm('⚠️ This will permanently delete ALL transactions, accounts, and settings.\n\nThis cannot be undone.');
        if (!first) return;
        const second = confirm('Second confirmation: delete everything and start fresh?');
        if (!second) return;

        UI.showLoading('Clearing all data...');
        try {
            Database.data = { transactions: [], accounts: {}, settings: {}, processedFiles: [] };
            await Database.saveToDrive();
            this.invalidateStatsCache();
            UI.hideLoading();
            UI.showMessage('All data cleared', 'success');
            this.switchView('overview');
        } catch (error) {
            UI.hideLoading();
            UI.showMessage('Error clearing data: ' + error.message, 'error');
        }
    },

    exportTransactionsCSV: function() {
        const txns = this.getFilteredTransactions();
        const data = Database.getData();
        const accounts = data.accounts || {};

        const headers = ['Date','Symbol','Exchange','Type','Qty','Price','Currency','Fees','Total','Account Name','Account Broker'];
        const rows = txns.map(t => {
            const acc = t.accountId ? accounts[t.accountId] : null;
            const row = [
                t.date, t.symbol, t.exchange || '', t.type, t.quantity,
                t.price, t.currency, t.fees || 0, t.total,
                acc ? acc.name : (t.accountId || ''),
                acc ? (acc.broker || t.broker || '') : (t.broker || '')
            ];
            // Wrap fields that might contain commas in quotes
            return row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Set up sync buttons in Sync view
     */
     setupSyncButtons: function() {
        const selectFolderBtn = document.getElementById('select-folder-btn');
        const scanBtn = document.getElementById('scan-new-files-btn');
        const processAllBtn = document.getElementById('process-all-btn');
        
        if (selectFolderBtn) {
            selectFolderBtn.addEventListener('click', async () => {
                await Drive.selectFolder();
            });
        }
        
        if (scanBtn) {
            scanBtn.addEventListener('click', async () => {
                await this.scanForNewFiles();
            });
        }
        
        if (processAllBtn) {
            processAllBtn.addEventListener('click', async () => {
                await this.processAllFiles();
            });
        }
    },
    
    /**
     * Show loading overlay
     */
     showLoading: function(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const messageEl = document.getElementById('loading-message');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (overlay) {
            overlay.classList.add('active');
        }
    },
    
    /**
     * Hide loading overlay
     */
     hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },
    
    /**
     * Format number as currency
     * Accepts optional currency code to show correct symbol
     */
    formatCurrency: function(amount, currency = null) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        
        // Use provided currency, or fall back to base currency
        const currencyCode = currency || CONFIG.baseCurrency;
        
        // Get currency symbol from config
        const currencyInfo = CONFIG.supportedCurrencies.find(c => c.code === currencyCode);
        const symbol = currencyInfo ? currencyInfo.symbol : currencyCode;
        
        // Format the number with 2 decimal places and thousands separator
        const formatted = Math.abs(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        // Handle negative amounts
        if (amount < 0) {
            return `-${symbol}${formatted}`;
        }
        
        return `${symbol}${formatted}`;
    },
    
    /**
     * Show a status message (toast notification)
     */
     showMessage: function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, 3000);
    },

    /**
     * Set up account management buttons
     */
     setupAccountButtons: function() {
        // Add Account button
        const addAccountBtn = document.getElementById('add-account-btn');
        if (addAccountBtn) {
            addAccountBtn.addEventListener('click', () => this.showAccountModal());
        }
        
        // Close modal button
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.hideAccountModal());
        }
        
        // Cancel button in form
        const cancelBtn = document.getElementById('cancel-account-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideAccountModal());
        }
        
        // Form submission
        const accountForm = document.getElementById('account-form');
        if (accountForm) {
            accountForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAccount();
            });
        }
        
        // Close modal when clicking outside
        const modal = document.getElementById('account-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAccountModal();
                }
            });
        }
    },
    
    /**
     * Populate form dropdowns with config data
     */
     populateFormDropdowns: function() {
        // Populate account types
        const typeSelect = document.getElementById('account-type');
        if (typeSelect && CONFIG.accountTypes) {
            typeSelect.innerHTML = '<option value="">Select type...</option>';
            CONFIG.accountTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = type.label;
                typeSelect.appendChild(option);
            });
        }
        
        // Populate currencies
        const currencySelect = document.getElementById('account-currency');
        if (currencySelect && CONFIG.supportedCurrencies) {
            currencySelect.innerHTML = '<option value="">Select currency...</option>';
            CONFIG.supportedCurrencies.forEach(curr => {
                const option = document.createElement('option');
                option.value = curr.code;
                option.textContent = `${curr.name} (${curr.code})`;
                currencySelect.appendChild(option);
            });
        }
    },
    
    /**
     * Show account modal for adding or editing
     */
     showAccountModal: function(accountId = null) {
        const modal = document.getElementById('account-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('account-form');
        
        // Reset form
        form.reset();
        this.editingAccountId = accountId;
        
        if (accountId) {
            // Editing existing account
            modalTitle.textContent = 'Edit Account';
            this.loadAccountIntoForm(accountId);
        } else {
            // Adding new account
            modalTitle.textContent = 'Add New Account';
        }
        
        modal.classList.add('active');
    },
    
    /**
     * Hide account modal
     */
     hideAccountModal: function() {
        const modal = document.getElementById('account-modal');
        modal.classList.remove('active');
        this.editingAccountId = null;
    },
    
    /**
     * Load account data into form for editing
     */
     loadAccountIntoForm: function(accountId) {
        if (typeof Database === 'undefined') return;
        
        const data = Database.getData();
        const account = data.accounts[accountId];
        
        if (!account) return;
        
        document.getElementById('account-name').value = account.name || '';
        document.getElementById('account-number').value = account.accountNumber || '';
        document.getElementById('broker-name').value = account.broker || '';
        document.getElementById('account-type').value = account.accountType || '';
        document.getElementById('account-currency').value = account.defaultCurrency || '';
        document.getElementById('account-holders').value = (account.holders || []).join(', ');
        document.getElementById('account-notes').value = account.notes || '';
    },
    
    /**
     * Save account (add or update)
     */
     saveAccount: async function() {
        const name = document.getElementById('account-name').value.trim();
        const accountNumber = document.getElementById('account-number').value.trim();
        const broker = document.getElementById('broker-name').value.trim();
        const accountType = document.getElementById('account-type').value;
        const currency = document.getElementById('account-currency').value;
        const notes = document.getElementById('account-notes').value.trim();
        const holdersInput = document.getElementById('account-holders').value.trim();
        
        if (!name || !accountNumber || !accountType || !currency) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Parse holders (comma-separated)
        const holders = holdersInput.split(',').map(h => h.trim()).filter(h => h.length > 0);
        
        if (holders.length === 0) {
            alert('Please enter at least one account holder');
            return;
        }

        this.showLoading('Saving account...');
        
        try {
            // Generate account ID (or use existing if editing)
            const accountId = this.editingAccountId || 
                'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Get last 4 digits of account number for matching
            const last4 = accountNumber.slice(-4);
            
            // Create account object
            const accountData = {
                id: accountId,
                name: name,
                accountNumber: accountNumber,
                accountNumberLast4: last4,
                broker: broker,
                accountType: accountType,
                defaultCurrency: currency,
                holders: holders,
                notes: notes,
                isActive: true,
                createdAt: this.editingAccountId ? 
                    Database.getData().accounts[accountId]?.createdAt : 
                    new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Save to database
            if (typeof Database !== 'undefined') {
                await Database.addAccount(accountId, accountData);
            }
            
            this.hideLoading();
            this.hideAccountModal();
            this.showMessage(
                this.editingAccountId ? 'Account updated successfully' : 'Account added successfully',
                'success'
            );
            
            // Refresh accounts view
            this.updateAccountsView();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error saving account:', error);
            this.showMessage('Error saving account', 'error');
        }
    },
    
    /**
     * Delete account
     */
     deleteAccount: async function(accountId) {
        if (typeof Database === 'undefined') return;
        
        const data = Database.getData();
        const account = data.accounts[accountId];
        
        if (!account) return;
        
        // Check if account has transactions
        const hasTransactions = data.transactions.some(t => t.accountId === accountId);
        
        let confirmMessage = `Are you sure you want to delete "${account.name}"?`;
        if (hasTransactions) {
            confirmMessage += '\n\nWARNING: This account has transactions. Deleting it will NOT delete the transactions, but they will be orphaned.';
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        this.showLoading('Deleting account...');
        
        try {
            delete data.accounts[accountId];
            await Database.saveToDrive();
            
            this.hideLoading();
            this.showMessage('Account deleted successfully', 'success');
            this.updateAccountsView();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error deleting account:', error);
            this.showMessage('Error deleting account', 'error');
        }
    },
    
    /**
     * Toggle account active/inactive status
     */
     toggleAccountStatus: async function(accountId) {
        if (typeof Database === 'undefined') return;
        
        const data = Database.getData();
        const account = data.accounts[accountId];
        
        if (!account) return;
        
        this.showLoading('Updating account...');
        
        try {
            account.isActive = !account.isActive;
            account.updatedAt = new Date().toISOString();
            
            await Database.addAccount(accountId, account);
            
            this.hideLoading();
            this.showMessage(
                account.isActive ? 'Account activated' : 'Account deactivated',
                'success'
            );
            this.updateAccountsView();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error updating account:', error);
            this.showMessage('Error updating account', 'error');
        }
    },
    
    /**
     * Update Accounts View
     */
     updateAccountsView: function() {
        console.log('Updating accounts view...');
        
        if (typeof Database === 'undefined') return;
        
        const data = Database.getData();
        const listEl = document.getElementById('accounts-list');
        
        if (!data.accounts || Object.keys(data.accounts).length === 0) {
            listEl.innerHTML = '<p class="empty-state">No accounts yet. Click "Add New Account" to create one.</p>';
            return;
        }
        
        let html = '';
        
        Object.values(data.accounts).forEach(account => {
            const statusBadge = account.isActive 
                ? '<span class="account-badge badge-active">Active</span>'
                : '<span class="account-badge badge-inactive">Inactive</span>';
            
            const currencyBadge = `<span class="account-badge badge-currency">${account.defaultCurrency}</span>`;
            
            // Count transactions for this account
            const txnCount = data.transactions.filter(t => t.accountId === account.id).length;
            
            html += `
                <div class="account-card">
                    <div class="account-card-header">
                        <div class="account-card-title">
                            <h3>${account.name}</h3>
                            <div class="account-card-subtitle">
                                ${statusBadge}
                                ${currencyBadge}
                            </div>
                        </div>
                        <div class="account-card-actions">
                            <button class="btn-icon" onclick="UI.showAccountModal('${account.id}')" title="Edit">
                                ✏️ Edit
                            </button>
                            <button class="btn-icon" onclick="UI.toggleAccountStatus('${account.id}')" title="${account.isActive ? 'Deactivate' : 'Activate'}">
                                ${account.isActive ? '⏸️ Pause' : '▶️ Activate'}
                            </button>
                            <button class="btn-icon danger" onclick="UI.deleteAccount('${account.id}')" title="Delete">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                    <div class="account-card-details">
                        <div class="account-detail">
                            <div class="account-detail-label">Account Number</div>
                            <div class="account-detail-value">${account.accountNumber}</div>
                        </div>
                        <div class="account-detail">
                            <div class="account-detail-label">Broker</div>
                            <div class="account-detail-value">${account.broker || 'N/A'}</div>
                        </div>
                        <div class="account-detail">
                            <div class="account-detail-label">Account Holders</div>
                            <div class="account-detail-value">${(account.holders || []).join(', ')}</div>
                        </div>
                        <div class="account-detail">
                            <div class="account-detail-label">Account Type</div>
                            <div class="account-detail-value">${this.formatAccountType(account.accountType)}</div>
                        </div>
                        <div class="account-detail">
                            <div class="account-detail-label">Transactions</div>
                            <div class="account-detail-value">${txnCount}</div>
                        </div>
                    </div>
                    ${account.notes ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); color: var(--text-muted); font-size: 0.82em;">📝 ${account.notes}</div>` : ''}
                </div>
            `;
        });
        
        listEl.innerHTML = html;
    },
    
    /**
     * Format account type for display
     */
     formatAccountType: function(typeValue) {
        const type = CONFIG.accountTypes.find(t => t.value === typeValue);
        return type ? type.label : typeValue;
    },

    /**
     * Initialize filters system — close popovers when clicking outside
     */
     initializeFilters: function() {
        document.addEventListener('click', (e) => {
            ['overview', 'holdings', 'transactions'].forEach(v => {
                const wrap = document.getElementById(`${v}-filter-wrap`);
                if (wrap && !wrap.contains(e.target)) {
                    const pop = document.getElementById(`${v}-filter-popover`);
                    const btn = document.getElementById(`${v}-filter-btn`);
                    if (pop) pop.classList.remove('open');
                    if (btn) btn.classList.remove('active');
                }
            });
        });
    },

    /**
     * Clear all filters
     */
     clearFilters: function(viewName) {
        this.activeFilters.accounts = [];
        this.activeFilters.holders = [];

        // Uncheck all boxes in this view's popover
        const pop = document.getElementById(`${viewName}-filter-popover`);
        if (pop) pop.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

        // Close the popover
        if (pop) pop.classList.remove('open');
        const btn = document.getElementById(`${viewName}-filter-btn`);
        if (btn) btn.classList.remove('active');

        this.renderFilterChips(viewName);
        this.loadViewData(viewName);
    },
    
    /**
     * Get filtered transactions based on active filters
     */
     getFilteredTransactions: function() {
        if (typeof Database === 'undefined') return [];

        const data = Database.getData();
        if (!data || !data.transactions) return [];

        let filtered = data.transactions;

        // Filter by accounts
        if (this.activeFilters.accounts.length > 0) {
            filtered = filtered.filter(t => this.activeFilters.accounts.includes(t.accountId));
        }

        // Filter by holders
        if (this.activeFilters.holders.length > 0) {
            filtered = filtered.filter(t => {
                const account = data.accounts[t.accountId];
                if (!account || !account.holders) return false;
                return account.holders.some(h => this.activeFilters.holders.includes(h));
            });
        }

        return filtered;
    },
    
    /**
     * Populate favorites bar for a view
     */
     populateFavorites: function(viewName) {
        if (typeof Database === 'undefined') return;
        
        const favorites = Database.getFavorites();
        const favBarEl = document.getElementById(`${viewName}-favorites-bar`);
        
        if (!favBarEl) return;
        
        const viewFavorites = Object.values(favorites).filter(fav => fav.view === viewName);
        
        if (viewFavorites.length === 0) {
            favBarEl.innerHTML = '';
            return;
        }
        
        let html = '<span class="favorites-label">⭐ Favorites:</span>';
        
        viewFavorites.forEach(fav => {
            html += `
                <button class="favorite-btn" onclick="UI.loadFavorite('${fav.id}')">
                    ${fav.name}
                    <span class="delete-favorite" onclick="event.stopPropagation(); UI.deleteFavorite('${fav.id}')">×</span>
                </button>
            `;
        });
        
        favBarEl.innerHTML = html;
    },
    
    /**
     * Show save favorite modal
     */
     showSaveFavoriteModal: function(viewName) {
        this.savingFavoriteForView = viewName;
        
        const modal = document.getElementById('favorite-modal');
        const summaryEl = document.getElementById('favorite-summary-content');
        
        const filters = this.activeFilters;
        const data = Database.getData();

        let summary = '';

        if (filters.accounts.length > 0) {
            summary += '<div class="filter-summary-item"><strong>Accounts:</strong> ';
            filters.accounts.forEach(accId => {
                const acc = data.accounts[accId];
                if (acc) {
                    summary += `<span class="filter-tag">${acc.name}</span>`;
                }
            });
            summary += '</div>';
        }

        if (filters.holders.length > 0) {
            summary += '<div class="filter-summary-item"><strong>Holders:</strong> ';
            filters.holders.forEach(holder => {
                summary += `<span class="filter-tag">${holder}</span>`;
            });
            summary += '</div>';
        }
        
        if (!summary) {
            summary = '<p style="color: var(--text-muted);">No filters selected</p>';
        }
        
        summaryEl.innerHTML = summary;
        document.getElementById('favorite-name').value = '';
        modal.classList.add('active');
    },
    
    /**
     * Hide favorite modal
     */
     hideFavoriteModal: function() {
        const modal = document.getElementById('favorite-modal');
        modal.classList.remove('active');
        this.savingFavoriteForView = null;
    },
    
    /**
     * Save favorite
     */
     saveFavorite: async function() {
        const name = document.getElementById('favorite-name').value.trim();
        
        if (!name) {
            alert('Please enter a name for this favorite');
            return;
        }
        
        const viewName = this.savingFavoriteForView;
        const filters = this.activeFilters; // shared flat filter state

        this.showLoading('Saving favorite...');

        try {
            const favoriteId = 'fav_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

            const favoriteData = {
                id: favoriteId,
                name: name,
                view: viewName,
                filters: {
                    accounts: [...filters.accounts],
                    holders: [...filters.holders]
                },
                createdAt: new Date().toISOString()
            };
            
            await Database.addFavorite(favoriteId, favoriteData);
            
            this.hideLoading();
            this.hideFavoriteModal();
            this.showMessage('Favorite saved successfully', 'success');
            this.populateFavorites(viewName);
            
        } catch (error) {
            this.hideLoading();
            console.error('Error saving favorite:', error);
            this.showMessage('Error saving favorite', 'error');
        }
    },
    
    /**
     * Load a favorite
     */
     loadFavorite: function(favoriteId) {
        const favorite = Database.getFavorite(favoriteId);
        
        if (!favorite) {
            this.showMessage('Favorite not found', 'error');
            return;
        }
        
        const viewName = favorite.view;

        // Apply to shared filter state
        this.activeFilters.accounts = [...favorite.filters.accounts];
        this.activeFilters.holders = [...favorite.filters.holders];

        if (this.currentView !== viewName) {
            this.switchView(viewName);
        } else {
            this.populateFilters(viewName);
            this.loadViewData(viewName);
        }
        
        this.showMessage(`Loaded favorite: ${favorite.name}`, 'success');
    },
    
    /**
     * Delete a favorite
     */
     deleteFavorite: async function(favoriteId) {
        const favorite = Database.getFavorite(favoriteId);
        
        if (!favorite) return;
        
        if (!confirm(`Delete favorite "${favorite.name}"?`)) {
            return;
        }
        
        this.showLoading('Deleting favorite...');
        
        try {
            await Database.deleteFavorite(favoriteId);
            
            this.hideLoading();
            this.showMessage('Favorite deleted', 'success');
            
            this.populateFavorites('overview');
            this.populateFavorites('holdings');
            this.populateFavorites('transactions');
            
        } catch (error) {
            this.hideLoading();
            console.error('Error deleting favorite:', error);
            this.showMessage('Error deleting favorite', 'error');
        }
    },

    /**
     * Scan for new contract note files
     */
     scanForNewFiles: async function() {
        if (!Drive.contractNotesFolderId) {
            UI.showMessage('Please select a Drive folder first', 'error');
            return;
        }
        
        UI.showLoading('Scanning for new files...');
        
        try {
            const unprocessedFiles = await Drive.getUnprocessedFiles();
            
            UI.hideLoading();
            
            if (unprocessedFiles.length === 0) {
                UI.showMessage('No new files found', 'info');
                this.displayNewFiles([]);
            } else {
                UI.showMessage(`Found ${unprocessedFiles.length} new file(s)`, 'success');
                this.displayNewFiles(unprocessedFiles);
            }
        } catch (error) {
            UI.hideLoading();
            console.error('Error scanning files:', error);
            UI.showMessage('Error scanning files: ' + error.message, 'error');
        }
    },
    
    /**
     * Display list of new files
     */
     displayNewFiles: function(files) {
        const listEl = document.getElementById('new-files-list');
        
        if (!listEl) return;
        
        if (files.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No new files to process</p>';
            return;
        }
        
        let html = '';

        files.forEach(file => {
            const date = new Date(file.createdTime).toLocaleDateString();
            const size = (file.size / 1024).toFixed(2);

            html += `
                <div class="file-row">
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${date} &bull; ${size} KB</div>
                    </div>
                    <button class="btn-primary btn-small" onclick="UI.processSingleFile('${file.id}', '${file.name}')">
                        Process
                    </button>
                </div>
            `;
        });

        listEl.innerHTML = html;
    },
    
    /**
     * Process a single file
     */
     processSingleFile: async function(fileId, fileName) {
        try {
            const transaction = await Parser.processContractNote(fileId, fileName);
            
            if (transaction) {
                this.updateOverview();
                this.scanForNewFiles();
            }
        } catch (error) {
            console.error('Error in processSingleFile:', error);
        }
    },
    
    /**
     * Process all unprocessed files in batch.
     * Calls Gemini on each file sequentially, then shows a single combined
     * validation modal. The user accepts/rejects everything before anything
     * is committed to the database.
     */
     processAllFiles: async function() {
        if (!Drive.contractNotesFolderId) {
            UI.showMessage('Please select a Drive folder first', 'error');
            return;
        }

        UI.showLoading('Scanning for unprocessed files…');
        let unprocessedFiles;
        try {
            unprocessedFiles = await Drive.getUnprocessedFiles();
        } catch (error) {
            UI.hideLoading();
            UI.showMessage('Error scanning files: ' + error.message, 'error');
            return;
        }

        if (unprocessedFiles.length === 0) {
            UI.hideLoading();
            UI.showMessage('No new files to process', 'info');
            return;
        }

        // Run Gemini extraction on each file — no UI side-effects yet
        const results = [];
        for (let i = 0; i < unprocessedFiles.length; i++) {
            const file = unprocessedFiles[i];
            UI.showLoading(`Extracting ${i + 1} of ${unprocessedFiles.length}: ${file.name}…`);
            const result = await Parser.extractTransactionsFromFile(file.id, file.name);
            results.push(result);
        }
        UI.hideLoading();

        const successful = results.filter(r => !r.error);
        const failed = results.filter(r => r.error);

        if (failed.length > 0) {
            const names = failed.map(f => f.fileName).join(', ');
            UI.showMessage(`${failed.length} file(s) could not be parsed and were skipped: ${names}`, 'warning');
        }

        if (successful.length === 0) {
            UI.showMessage('No transactions could be extracted from any file.', 'error');
            return;
        }

        // Show the combined batch validation modal — nothing is saved until user confirms
        await Parser.showBatchValidationUI(successful);
        // saveBatchValidatedTransactions (called inside the modal) handles DB writes + UI refresh
    },

    /**
     * Open the edit transaction modal populated with the given transaction's data
     */
    showEditTransactionModal: function(transactionId) {
        const data = Database.getData();
        const txn = data.transactions.find(t => t.id === transactionId);
        if (!txn) return;

        // Populate hidden ID
        document.getElementById('edit-txn-id').value = txn.id;

        // Core fields
        document.getElementById('edit-txn-date').value = txn.date || '';
        document.getElementById('edit-txn-symbol').value = txn.symbol || '';
        document.getElementById('edit-txn-company').value = txn.company || '';
        document.getElementById('edit-txn-exchange').value = txn.exchange || '';
        document.getElementById('edit-txn-type').value = txn.type || 'buy';
        document.getElementById('edit-txn-quantity').value = txn.quantity || '';
        document.getElementById('edit-txn-price').value = txn.price || '';
        document.getElementById('edit-txn-fees').value = txn.fees || '';
        document.getElementById('edit-txn-total').value = txn.total || '';
        document.getElementById('edit-txn-broker').value = txn.broker || '';

        // Settlement currency dropdown
        const currencySelect = document.getElementById('edit-txn-currency');
        currencySelect.innerHTML = '';
        (CONFIG.supportedCurrencies || []).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = `${c.code} — ${c.name}`;
            if (c.code === txn.currency) opt.selected = true;
            currencySelect.appendChild(opt);
        });

        // Price currency dropdown (includes GBX)
        const priceCurrencySelect = document.getElementById('edit-txn-price-currency');
        priceCurrencySelect.innerHTML = '';
        ['USD','CAD','GBP','GBX','EUR','AUD','CHF'].forEach(code => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = code;
            if (code === (txn.priceCurrency || txn.currency)) opt.selected = true;
            priceCurrencySelect.appendChild(opt);
        });

        // Fees currency dropdown (no GBX)
        const feesCurrencySelect = document.getElementById('edit-txn-fees-currency');
        feesCurrencySelect.innerHTML = '';
        (CONFIG.supportedCurrencies || []).filter(c => c.code !== 'GBX').forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = c.code;
            if (c.code === (txn.feesCurrency || txn.currency)) opt.selected = true;
            feesCurrencySelect.appendChild(opt);
        });

        // Account dropdown — built from Database accounts
        const accountSelect = document.getElementById('edit-txn-account');
        accountSelect.innerHTML = '<option value="">— No account —</option>';
        const accountsMap = data.accounts || {};
        Object.values(accountsMap).forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = acc.name;
            if (acc.id === txn.accountId) opt.selected = true;
            accountSelect.appendChild(opt);
        });

        // Auto-populate account number and broker from selected account
        const selectedAcc = txn.accountId ? accountsMap[txn.accountId] : null;
        const brokerField = document.getElementById('edit-txn-broker');
        const accNumField = document.getElementById('edit-txn-account-number');
        if (brokerField) brokerField.value = selectedAcc ? (selectedAcc.broker || txn.broker || '') : (txn.broker || '');
        if (accNumField) accNumField.value = selectedAcc ? (selectedAcc.accountNumber || '') : '';

        // Wire up the delete button (scoped to this transaction)
        const deleteBtn = document.getElementById('edit-txn-delete-btn');
        deleteBtn.onclick = () => this.deleteTransactionFromModal(txn.id);

        document.getElementById('edit-transaction-modal').classList.add('active');
    },

    hideEditTransactionModal: function() {
        document.getElementById('edit-transaction-modal').classList.remove('active');
    },

    /**
     * Save changes from the edit transaction modal back to the database
     */
    saveEditedTransaction: async function() {
        const id = document.getElementById('edit-txn-id').value;
        if (!id) return;

        const updates = {
            date:     document.getElementById('edit-txn-date').value,
            symbol:   document.getElementById('edit-txn-symbol').value.trim().toUpperCase(),
            company:  document.getElementById('edit-txn-company').value.trim(),
            exchange: document.getElementById('edit-txn-exchange').value.trim().toUpperCase(),
            type:     document.getElementById('edit-txn-type').value,
            quantity: parseFloat(document.getElementById('edit-txn-quantity').value) || 0,
            currency:      document.getElementById('edit-txn-currency').value,
            price:         parseFloat(document.getElementById('edit-txn-price').value) || 0,
            priceCurrency: document.getElementById('edit-txn-price-currency').value,
            fees:          parseFloat(document.getElementById('edit-txn-fees').value) || 0,
            feesCurrency:  document.getElementById('edit-txn-fees-currency').value,
            total:    parseFloat(document.getElementById('edit-txn-total').value) || 0,
            accountId: document.getElementById('edit-txn-account').value || null,
            broker:   document.getElementById('edit-txn-broker').value.trim(),
        };

        UI.showLoading('Saving transaction...');
        try {
            await Database.updateTransaction(id, updates);
            UI.hideLoading();
            this.hideEditTransactionModal();
            UI.showMessage('Transaction updated', 'success');
            this.invalidateStatsCache();
            this.updateTransactions();
            this.updateOverview();
            this.updateHoldings();
        } catch (error) {
            UI.hideLoading();
            UI.showMessage('Error saving transaction: ' + error.message, 'error');
        }
    },

    /**
     * Delete a transaction from within the edit modal (requires confirmation)
     */
    deleteTransactionFromModal: async function(transactionId) {
        const confirmed = confirm('Delete this transaction?\n\nThis cannot be undone. Are you sure?');
        if (!confirmed) return;

        UI.showLoading('Deleting transaction...');
        try {
            await Database.deleteTransaction(transactionId);
            UI.hideLoading();
            this.hideEditTransactionModal();
            UI.showMessage('Transaction deleted', 'success');
            this.invalidateStatsCache();
            this.updateTransactions();
            this.updateOverview();
            this.updateHoldings();
        } catch (error) {
            UI.hideLoading();
            UI.showMessage('Error deleting transaction: ' + error.message, 'error');
        }
    },

    /**
     * Delete a transaction with confirmation
     */
     deleteTransaction: async function(transactionId) {
        const confirmed = confirm('⚠️ Are you sure you want to delete this transaction?\n\nThis action cannot be undone.');
        
        if (!confirmed) {
            return;
        }
        
        UI.showLoading('Deleting transaction...');
        
        try {
            await Database.deleteTransaction(transactionId);

            UI.hideLoading();
            UI.showMessage('Transaction deleted successfully', 'success');
            this.invalidateStatsCache();
            this.updateTransactions();
            this.updateOverview();
            this.updateHoldings();
            
        } catch (error) {
            UI.hideLoading();
            console.error('Error deleting transaction:', error);
            UI.showMessage('Error deleting transaction: ' + error.message, 'error');
        }
    },

    /**
     * Refresh all stock prices
     * Only fetches prices for CURRENT holdings (not sold stocks)
     */
     refreshAllPrices: async function() {
        console.log('Refreshing all stock prices and FX rates...');
        
        UI.showLoading('Fetching latest stock prices and FX rates...');
        
        const statusEl = document.getElementById('price-update-status');
        if (statusEl) {
            statusEl.textContent = 'Fetching prices and FX rates...';
        }
        
        try {
            // Refresh FX rates first
            if (typeof FX !== 'undefined') {
                try {
                    await FX.getLiveRates();
                    console.log('✅ FX rates refreshed');
                } catch (error) {
                    console.error('⚠️ FX refresh failed:', error);
                }
            }
            
            const data = Database.getData();
            
            // Get CURRENT holdings only (quantity > 0, not sold stocks)
            const holdings = Portfolio.calculateHoldings(data.transactions);
            
            if (holdings.length === 0) {
                UI.hideLoading();
                if (statusEl) statusEl.textContent = 'No current holdings to update';
                return;
            }
            
            // Build list of { symbol, exchange } for current holdings only
            // Scan all transactions for exchange — first transaction may lack it if entered manually
            const symbolsWithExchanges = holdings.map(h => ({
                symbol: h.symbol,
                exchange: h.transactions.find(t => t.exchange)?.exchange || null
            }));
            
            console.log('Holdings to update:', symbolsWithExchanges);
            
            // Clear cache to force fresh prices
            Prices.clearCache();

            // Fetch all prices
            await Prices.getBatchPrices(symbolsWithExchanges);

            // Persist fetched prices to Drive DB so they load on any device
            try {
                const dbData = Database.getData();
                if (!dbData.settings) dbData.settings = {};
                if (!dbData.settings.lastPrices) dbData.settings.lastPrices = {};

                symbolsWithExchanges.forEach(({ symbol, exchange }) => {
                    const useAV = Prices.shouldUseAlphaVantage(exchange);
                    const cacheKey = useAV
                        ? Prices.formatSymbolForAlphaVantage(symbol, exchange)
                        : Prices.formatSymbolForFinnhub(symbol, exchange);
                    const lkp = localStorage.getItem(`price_last_${cacheKey}`);
                    if (lkp) dbData.settings.lastPrices[cacheKey] = JSON.parse(lkp);
                });

                await Database.saveToDrive();
                console.log('✅ Prices saved to Drive DB for cross-device access');
            } catch (e) {
                console.warn('Could not persist prices to Drive:', e);
            }

            UI.hideLoading();

            // Update status
            if (statusEl) {
                statusEl.textContent = `✅ Updated ${holdings.length} holdings just now`;
            }

            // Update cache info display
            this.updatePriceCacheInfo();

            // Invalidate stats cache so views recalculate with fresh prices
            this.invalidateStatsCache();

            // Refresh views
            this.updateOverview();
            this.updateHoldings();

            UI.showMessage('Prices updated successfully', 'success');
            
        } catch (error) {
            UI.hideLoading();
            console.error('Error refreshing prices:', error);
            UI.showMessage('Error updating prices: ' + error.message, 'error');
            
            if (statusEl) {
                statusEl.textContent = '❌ Error fetching prices';
            }
        }
    },
    
    /**
     * Update price cache info display
     */
    updatePriceCacheInfo: function() {
        const cacheInfo = Prices.getCacheInfo();
        
        const cacheInfoEl = document.getElementById('price-cache-info');
        if (cacheInfoEl) {
            cacheInfoEl.textContent = `Cache: ${cacheInfo.symbols} symbols (oldest: ${cacheInfo.oldestAge}min)`;
        }
        
        const apiCallsEl = document.getElementById('price-api-calls');
        if (apiCallsEl) {
            apiCallsEl.textContent = `AV: ${cacheInfo.alphaVantageCalls}/25 | FH: ${cacheInfo.finnhubCalls}/60`;
        }
    },

};