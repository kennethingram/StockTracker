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
    
    // Track active filters per view
    activeFilters: {
        overview: { accounts: [], holders: [] },
        holdings: { accounts: [], holders: [] },
        transactions: { accounts: [], holders: [] }
    },
    
    // Track current favorite being saved
    savingFavoriteForView: null,

    
    /**
     * Initialize the UI module
     * Set up navigation, event listeners
     */
     init: function() {
        console.log('UI module initializing...');
        
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
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const viewName = e.target.getAttribute('data-view');
                this.switchView(viewName);
            });
        });
    },
    
    /**
     * Switch between different views in the dashboard
     */
     switchView: function(viewName) {
        console.log('Switching to view:', viewName);
        
        // Update current view
        this.currentView = viewName;
        
        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show the selected view
        const activeView = document.getElementById(`${viewName}-view`);
        if (activeView) {
            activeView.classList.add('active');
        }
        
        // Load data for the view
        this.loadViewData(viewName);
    },
    
    /**
     * Populate filter dropdowns for a view
     */
     populateFilters: function(viewName) {
        console.log('Populating filters for:', viewName);
        
        if (typeof Database === 'undefined') return;
        
        const data = Database.getData();
        if (!data) return;
        
        // Get unique accounts
        const accounts = Object.values(data.accounts || {});
        
        // Get unique holders
        const holdersSet = new Set();
        accounts.forEach(acc => {
            if (acc.holders) {
                acc.holders.forEach(h => holdersSet.add(h));
            }
        });
        const holders = Array.from(holdersSet).sort();
        
        // Populate account filters as multi-select dropdown
        const accountFilterEl = document.getElementById(`${viewName}-account-filters`);
        if (accountFilterEl) {
            let html = '<select multiple class="multi-select-dropdown" id="' + viewName + '-account-select" onchange="UI.onMultiSelectChange(\'' + viewName + '\', \'accounts\')">';
            accounts.forEach(acc => {
                const selected = this.activeFilters[viewName].accounts.includes(acc.id) ? 'selected' : '';
                const statusBadge = acc.isActive ? '🟢' : '⚫';
                html += `<option value="${acc.id}" ${selected}>${statusBadge} ${acc.name}</option>`;
            });
            html += '</select>';
            accountFilterEl.innerHTML = html || '<p style="color: #a0aec0; font-size: 0.9em;">No accounts</p>';
        }
        
        // Populate holder filters as multi-select dropdown
        const holderFilterEl = document.getElementById(`${viewName}-holder-filters`);
        if (holderFilterEl) {
            let html = '<select multiple class="multi-select-dropdown" id="' + viewName + '-holder-select" onchange="UI.onMultiSelectChange(\'' + viewName + '\', \'holders\')">';
            holders.forEach(holder => {
                const selected = this.activeFilters[viewName].holders.includes(holder) ? 'selected' : '';
                html += `<option value="${holder}" ${selected}>${holder}</option>`;
            });
            html += '</select>';
            holderFilterEl.innerHTML = html || '<p style="color: #a0aec0; font-size: 0.9em;">No holders</p>';
        }
    },
    
    /**
     * Handle multi-select dropdown change
     */
     onMultiSelectChange: function(viewName, filterType) {
        const selectId = `${viewName}-${filterType === 'accounts' ? 'account' : 'holder'}-select`;
        const selectEl = document.getElementById(selectId);
        
        if (!selectEl) return;
        
        // Get selected values
        const selected = Array.from(selectEl.selectedOptions).map(option => option.value);
        
        // Update active filters
        this.activeFilters[viewName][filterType] = selected;
        
        console.log('Filters updated:', this.activeFilters[viewName]);
        
        // Reload the view with new filters
        this.loadViewData(viewName);
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
        }
    },


    /**
     * Update the Overview view
     * Shows portfolio summary stats
     */
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
        
        // Get filtered transactions
        const filteredTxns = this.getFilteredTransactions('overview');
        
        // Create filtered data object
        const filteredData = {
            ...data,
            transactions: filteredTxns
        };
        
        // Calculate portfolio stats with filtered data
        const stats = await Portfolio.calculatePortfolioStats(filteredData);
        
        // Update stat cards
        document.getElementById('total-value').textContent = 
            this.formatCurrency(stats.totalCurrentValue);
        document.getElementById('value-currency').textContent = 
            stats.baseCurrency;
        
        document.getElementById('total-invested').textContent = 
            this.formatCurrency(stats.totalInvested);
        document.getElementById('invested-currency').textContent = 
            stats.baseCurrency;
        
        // P/L card with color
        const plElement = document.getElementById('total-pl');
        plElement.textContent = this.formatCurrency(Math.abs(stats.totalGainLoss));
        
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
        
        // Update recent transactions
        this.updateRecentTransactions(filteredTxns);
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
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="border-bottom: 2px solid #e2e8f0;">';
        html += '<th style="padding: 10px; text-align: left;">Date</th>';
        html += '<th style="padding: 10px; text-align: left;">Symbol</th>';
        html += '<th style="padding: 10px; text-align: left;">Type</th>';
        html += '<th style="padding: 10px; text-align: right;">Quantity</th>';
        html += '<th style="padding: 10px; text-align: right;">Price</th>';
        html += '<th style="padding: 10px; text-align: right;">Total</th>';
        html += '</tr></thead><tbody>';
        
        recent.forEach(txn => {
            html += '<tr style="border-bottom: 1px solid #e2e8f0;">';
            html += `<td style="padding: 10px;">${txn.date}</td>`;
            html += `<td style="padding: 10px; font-weight: 600;">${txn.symbol}</td>`;
            html += `<td style="padding: 10px;"><span style="padding: 4px 8px; border-radius: 4px; background: ${txn.type === 'buy' ? '#c6f6d5' : '#fed7d7'}; color: ${txn.type === 'buy' ? '#22543d' : '#742a2a'};">${txn.type.toUpperCase()}</span></td>`;
            html += `<td style="padding: 10px; text-align: right;">${txn.quantity}</td>`;
            html += `<td style="padding: 10px; text-align: right;">${this.formatCurrency(txn.price, txn.currency)}</td>`;
            html += `<td style="padding: 10px; text-align: right; font-weight: 600;">${this.formatCurrency(txn.total, txn.currency)}</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        listEl.innerHTML = html;
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
        
        // Get filtered transactions
        const filteredTxns = this.getFilteredTransactions('holdings');
        
        // Create filtered data object
        const filteredData = {
            ...data,
            transactions: filteredTxns
        };
        
        const stats = await Portfolio.calculatePortfolioStats(filteredData);
        const holdings = stats.holdings;
        
        const listEl = document.getElementById('holdings-list');
        
        if (holdings.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No holdings yet.</p>';
            return;
        }
        
        let html = '<div style="display: grid; gap: 20px;">';
        
        holdings.forEach(holding => {
            const perf = holding.performance;
            
            // Use price currency from API if available, else fall back to holding currency
            const priceCurrency = perf.priceCurrency || holding.currency;
            
            // Determine P/L color
            let plClass = 'neutral';
            let plSign = '';
            if (perf.gainLoss > 0) {
                plClass = 'positive';
                plSign = '+';
            } else if (perf.gainLoss < 0) {
                plClass = 'negative';
            }
            
            // ARR color
            let arrClass = 'neutral';
            let arrSign = '';
            if (perf.arr > 0) {
                arrClass = 'positive';
                arrSign = '+';
            } else if (perf.arr < 0) {
                arrClass = 'negative';
            }
            
            html += `
                <div style="background: #f7fafc; padding: 25px; border-radius: 10px; border-left: 5px solid #667eea;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                        <div>
                            <h3 style="margin: 0; color: #2d3748; font-size: 1.8em;">${holding.symbol}</h3>
                            <p style="margin: 5px 0; color: #718096;">${holding.company || 'Unknown Company'}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.2em; font-weight: 600; color: #667eea;">
                                ${perf.currentPrice 
                                    ? this.formatCurrency(perf.currentPrice, priceCurrency) 
                                    : 'Price N/A'}
                            </div>
                            <div style="color: #718096; font-size: 0.9em;">Current Price (${priceCurrency})</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 15px;">
                        <div>
                            <div style="color: #718096; font-size: 0.9em;">Quantity</div>
                            <div style="font-weight: 600; color: #2d3748; font-size: 1.3em;">${holding.quantity} shares</div>
                        </div>
                        <div>
                            <div style="color: #718096; font-size: 0.9em;">Avg Cost (${holding.currency})</div>
                            <div style="font-weight: 600; color: #2d3748;">${this.formatCurrency(holding.avgCostInBase, holding.currency)}</div>
                        </div>
                        <div>
                            <div style="color: #718096; font-size: 0.9em;">Total Cost (${holding.currency})</div>
                            <div style="font-weight: 600; color: #2d3748;">${this.formatCurrency(holding.totalCostInBase, holding.currency)}</div>
                        </div>
                        <div>
                            <div style="color: #718096; font-size: 0.9em;">Current Value (${priceCurrency})</div>
                            <div style="font-weight: 600; color: #2d3748;">
                                ${perf.currentValueInBase 
                                    ? this.formatCurrency(perf.currentValueInBase, priceCurrency) 
                                    : 'N/A'}
                            </div>
                        </div>
                    </div>
                    
                    ${perf.gainLoss !== null ? `
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            <div>
                                <div style="color: #718096; font-size: 0.9em; margin-bottom: 5px;">Profit/Loss (${priceCurrency})</div>
                                <div style="font-size: 1.4em; font-weight: 700;" class="${plClass}">
                                    ${plSign}${this.formatCurrency(Math.abs(perf.gainLoss), priceCurrency)}
                                </div>
                                <div style="color: #718096; font-size: 0.95em; margin-top: 3px;">
                                    ${plSign}${perf.gainLossPercent.toFixed(2)}%
                                </div>
                            </div>
                            <div>
                                <div style="color: #718096; font-size: 0.9em; margin-bottom: 5px;">Annualized Return</div>
                                <div style="font-size: 1.4em; font-weight: 700;" class="${arrClass}">
                                    ${arrSign}${perf.arr.toFixed(2)}%
                                </div>
                                <div style="color: #718096; font-size: 0.95em; margin-top: 3px;">
                                    ${perf.yearsHeld.toFixed(2)} years held
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                        <div style="color: #718096; font-size: 0.85em;">
                            Account: <strong>${holding.accountId || 'N/A'}</strong> • 
                            Currency: <strong>${holding.currency}</strong>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
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
        const filteredTxns = this.getFilteredTransactions('transactions');
        
        const listEl = document.getElementById('transactions-list');
        
        if (filteredTxns.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No transactions yet.</p>';
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="border-bottom: 2px solid #e2e8f0; background: #f7fafc;">';
        html += '<th style="padding: 15px; text-align: left;">Date</th>';
        html += '<th style="padding: 15px; text-align: left;">Symbol</th>';
        html += '<th style="padding: 15px; text-align: left;">Exchange</th>';
        html += '<th style="padding: 15px; text-align: left;">Type</th>';
        html += '<th style="padding: 15px; text-align: right;">Quantity</th>';
        html += '<th style="padding: 15px; text-align: right;">Price</th>';
        html += '<th style="padding: 15px; text-align: right;">Fees</th>';
        html += '<th style="padding: 15px; text-align: right;">Total</th>';
        html += '<th style="padding: 15px; text-align: left;">Account</th>';
        html += '<th style="padding: 15px; text-align: left;">Actions</th>';
        html += '</tr></thead><tbody>';
        
        // Show newest first
        const sorted = [...filteredTxns].reverse();
        
        sorted.forEach(txn => {
            html += '<tr style="border-bottom: 1px solid #e2e8f0;">';
            html += `<td style="padding: 15px;">${txn.date}</td>`;
            html += `<td style="padding: 15px; font-weight: 600;">${txn.symbol}</td>`;
            html += `<td style="padding: 15px; color: #718096; font-size: 0.9em;">${txn.exchange || 'Auto'}</td>`;
            html += `<td style="padding: 15px;"><span style="padding: 4px 8px; border-radius: 4px; background: ${txn.type === 'buy' ? '#c6f6d5' : '#fed7d7'}; color: ${txn.type === 'buy' ? '#22543d' : '#742a2a'};">${txn.type.toUpperCase()}</span></td>`;
            html += `<td style="padding: 15px; text-align: right;">${txn.quantity}</td>`;
            html += `<td style="padding: 15px; text-align: right;">${this.formatCurrency(txn.price, txn.currency)}</td>`;
            html += `<td style="padding: 15px; text-align: right;">${this.formatCurrency(txn.fees || 0, txn.currency)}</td>`;
            html += `<td style="padding: 15px; text-align: right; font-weight: 600;">${this.formatCurrency(txn.total, txn.currency)}</td>`;
            html += `<td style="padding: 15px;">${txn.accountId || 'N/A'}</td>`;
            html += `<td style="padding: 15px;">
                <button class="btn-secondary btn-small" onclick="UI.deleteTransaction('${txn.id}')">🗑️ Delete</button>
            </td>`;
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
        
        // Update folder name display
        const folderNameEl = document.getElementById('folder-name');
        if (folderNameEl) {
            if (Drive.contractNotesFolderId) {
                try {
                    const folderInfo = await Drive.getFolderInfo(Drive.contractNotesFolderId);
                    folderNameEl.textContent = folderInfo.name;
                } catch (error) {
                    console.error('Error loading folder info:', error);
                    folderNameEl.textContent = 'Error loading folder';
                }
            } else {
                folderNameEl.textContent = 'Not set';
            }
        }
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
     * Show a status message
     */
     showMessage: function(message, type = 'info') {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
            color: white;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
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
                    ${account.notes ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 0.9em;">📝 ${account.notes}</div>` : ''}
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
     * Initialize filters system
     */
     initializeFilters: function() {
        console.log('Initializing filters...');
    },

    /**
     * Clear all filters for a view
     */
     clearFilters: function(viewName) {
        this.activeFilters[viewName] = { accounts: [], holders: [] };
        
        const accountSelect = document.getElementById(`${viewName}-account-select`);
        const holderSelect = document.getElementById(`${viewName}-holder-select`);
        
        if (accountSelect) {
            Array.from(accountSelect.options).forEach(option => option.selected = false);
        }
        if (holderSelect) {
            Array.from(holderSelect.options).forEach(option => option.selected = false);
        }
        
        this.loadViewData(viewName);
    },
    
    /**
     * Get filtered transactions based on active filters
     */
     getFilteredTransactions: function(viewName) {
        if (typeof Database === 'undefined') return [];
        
        const data = Database.getData();
        if (!data || !data.transactions) return [];
        
        let filtered = data.transactions;
        const filters = this.activeFilters[viewName];
        
        // Filter by accounts
        if (filters.accounts.length > 0) {
            filtered = filtered.filter(t => filters.accounts.includes(t.accountId));
        }
        
        // Filter by holders
        if (filters.holders.length > 0) {
            filtered = filtered.filter(t => {
                const account = data.accounts[t.accountId];
                if (!account || !account.holders) return false;
                return account.holders.some(h => filters.holders.includes(h));
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
        
        const filters = this.activeFilters[viewName];
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
            summary = '<p style="color: #a0aec0;">No filters selected</p>';
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
        const filters = this.activeFilters[viewName];
        
        this.showLoading('Saving favorite...');
        
        try {
            const favoriteId = 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
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
        
        this.activeFilters[viewName] = {
            accounts: [...favorite.filters.accounts],
            holders: [...favorite.filters.holders]
        };
        
        if (this.currentView !== viewName) {
            this.switchView(viewName);
        } else {
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
            listEl.innerHTML = '<p style="color: #a0aec0; padding: 20px;">No new files to process</p>';
            return;
        }
        
        let html = '<h3 style="color: white; margin-bottom: 15px;">New Contract Notes:</h3>';
        html += '<div style="background: white; border-radius: 10px; padding: 20px;">';
        
        files.forEach(file => {
            const date = new Date(file.createdTime).toLocaleDateString();
            const size = (file.size / 1024).toFixed(2);
            
            html += `
                <div style="padding: 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #2d3748;">${file.name}</div>
                        <div style="font-size: 0.9em; color: #718096; margin-top: 5px;">
                            ${date} • ${size} KB
                        </div>
                    </div>
                    <button class="btn-primary btn-small" onclick="UI.processSingleFile('${file.id}', '${file.name}')">
                        Process
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
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
     * Process all unprocessed files
     */
     processAllFiles: async function() {
        UI.showMessage('Batch processing functionality coming in Phase 2!', 'info');
        console.log('Would process all files');
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
        console.log('Refreshing all stock prices...');
        
        UI.showLoading('Fetching latest stock prices...');
        
        const statusEl = document.getElementById('price-update-status');
        if (statusEl) {
            statusEl.textContent = 'Fetching prices...';
        }
        
        try {
            const data = Database.getData();
            
            // Get CURRENT holdings only (quantity > 0, not sold stocks)
            const holdings = Portfolio.calculateHoldings(data.transactions);
            
            if (holdings.length === 0) {
                UI.hideLoading();
                if (statusEl) statusEl.textContent = 'No current holdings to update';
                return;
            }
            
            // Build list of { symbol, exchange } for current holdings only
            const symbolsWithExchanges = holdings.map(h => ({
                symbol: h.symbol,
                exchange: h.transactions[0]?.exchange || null
            }));
            
            console.log('Holdings to update:', symbolsWithExchanges);
            
            // Clear cache to force fresh prices
            Prices.clearCache();
            
            // Fetch all prices
            await Prices.getBatchPrices(symbolsWithExchanges);
            
            UI.hideLoading();
            
            // Update status
            if (statusEl) {
                statusEl.textContent = `✅ Updated ${holdings.length} holdings just now`;
            }
            
            // Update cache info display
            this.updatePriceCacheInfo();
            
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