// ===================================
// DATABASE MODULE
// Manages transaction data storage in Google Drive
// Data stored as JSON file
// ===================================

const Database = {
    // The data structure
    data: {
        accounts: {},      // All your trading accounts (enhanced structure)
        transactions: [],  // All your trades (enhanced with currency)
        processedFiles: [], // Track which contract notes we've already processed
        favorites: {},     // Saved filter combinations
        fxRates: {},       // FX rates (live and historical)
        settings: {        // User preferences
            baseCurrency: CONFIG.baseCurrency,
            createdAt: new Date().toISOString()
        }
    },
    
    // Google Drive file ID for the database
    databaseFileId: null,
    
    // Track if data has been loaded
    isLoaded: false,
    
    /**
     * Initialize the database module
     * Load existing data from Google Drive
     */
    init: async function() {
        console.log('Database module initializing...');
        
        // Check if authenticated
        if (!Auth.isAuthenticated()) {
            console.log('Not authenticated, skipping database init');
            return;
        }
        
        try {
            // Load data from Google Drive
            await this.loadFromDrive();
        } catch (error) {
            console.error('Error initializing database:', error);
            // Don't throw - just use empty data
            this.data = {
                accounts: {},
                transactions: [],
                processedFiles: [],
                favorites: {},
                fxRates: {},
                settings: {
                    baseCurrency: CONFIG.baseCurrency,
                    createdAt: new Date().toISOString()
                }
            };
            this.isLoaded = true;
        }
    },
    
    /**
     * Load database from Google Drive
     * If file doesn't exist, create it
     */
    loadFromDrive: async function() {
        console.log('Loading database from Drive...');
        
        try {
            // Search for the database file
            const fileId = await this.findDatabaseFile();
            
            if (fileId) {
                // File exists, load it
                console.log('Found database file:', fileId);
                this.databaseFileId = fileId;
                await this.readDatabaseFile(fileId);
            } else {
                // File doesn't exist, create new one
                console.log('Database file not found, creating new one...');
                await this.createDatabaseFile();
            }
            
            this.isLoaded = true;
            console.log('✅ Database loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading database:', error);
            // Don't show error toast if we're redirecting to login for auth expiry
            if (error.message !== 'Authentication expired') {
                UI.showMessage('Error loading database', 'error');
            }
        }
    },
    
    /**
     * Find the database file in Google Drive
     * Returns file ID if found, null if not found
     */
    findDatabaseFile: async function() {
        const token = Auth.getAccessToken();
        
        // Search for file by name in specific folder
        const STORAGE_FOLDER_ID = '1CPuJg--6dJ-x7LbWdlTj6Pd_CxAYyQlI';  // ← Your folder ID
        const query = `name='${CONFIG.databaseFileName}' and '${STORAGE_FOLDER_ID}' in parents and trashed=false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            if (typeof Auth !== 'undefined') Auth.handleTokenExpired();
            throw new Error('Authentication expired');
        }

        const data = await response.json();

        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }

        return null;
    },
    
    /**
     * Read database file content from Drive
     */
    readDatabaseFile: async function(fileId) {
        const token = Auth.getAccessToken();
        
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const fileData = await response.json();
            this.data = fileData;

            // Ensure fxRates exists
            if (!this.data.fxRates) {
                this.data.fxRates = {};
            }

            // Migrate legacy field name: contractReference → contractNoteNo
            if (this.data.transactions) {
                let migrated = 0;
                this.data.transactions.forEach(t => {
                    if ('contractReference' in t) {
                        t.contractNoteNo = t.contractNoteNo || t.contractReference;
                        delete t.contractReference;
                        migrated++;
                    }
                });
                if (migrated > 0) {
                    console.log(`Migrated ${migrated} transaction(s): contractReference → contractNoteNo`);
                    this.saveToDrive(); // persist the rename to Drive silently
                }
            }

            console.log('Database loaded:', this.data);
        } else if (response.status === 401) {
            if (typeof Auth !== 'undefined') Auth.handleTokenExpired();
            throw new Error('Authentication expired');
        } else {
            throw new Error('Failed to read database file');
        }
    },
    
    /**
     * Create new database file in Google Drive
     */
    createDatabaseFile: async function() {
        const token = Auth.getAccessToken();
        
        // Create file metadata
        const STORAGE_FOLDER_ID = '1CPuJg--6dJ-x7LbWdlTj6Pd_CxAYyQlI';  // ← Your folder ID from Step 2
        
        const metadata = {
            name: CONFIG.databaseFileName,
            mimeType: 'application/json',
            parents: [STORAGE_FOLDER_ID]  // ← Save in this folder
        };
        
        // Create file content (initial empty database)
        const initialData = {
            accounts: {},
            transactions: [],
            processedFiles: [],
            favorites: {},
            fxRates: {},
            settings: {
                baseCurrency: CONFIG.baseCurrency,
                createdAt: new Date().toISOString()
            },
            created: new Date().toISOString(),
            version: '1.0.0'
        };
        
        // Create multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        const body = 
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(initialData, null, 2) +
            close_delim;
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
        });
        
        if (response.ok) {
            const result = await response.json();
            this.databaseFileId = result.id;
            this.data = initialData;
            console.log('✅ Database file created:', result.id);
        } else {
            throw new Error('Failed to create database file');
        }
    },
    
    /**
     * Save database to Google Drive
     */
    saveToDrive: async function() {
        console.log('Saving database to Drive...');
        
        if (!this.databaseFileId) {
            console.error('No database file ID');
            return;
        }
        
        const token = Auth.getAccessToken();
        
        // Update the data with timestamp
        this.data.lastModified = new Date().toISOString();
        
        const url = `https://www.googleapis.com/upload/drive/v3/files/${this.databaseFileId}?uploadType=media`;
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.data, null, 2)
        });
        
        if (response.ok) {
            console.log('✅ Database saved successfully');
            UI.showMessage('Data saved', 'success');
        } else {
            console.error('❌ Failed to save database');
            UI.showMessage('Error saving data', 'error');
            throw new Error('Failed to save database');
        }
    },
    
    /**
     * Add a new transaction
     */
    addTransaction: async function(transaction) {
        console.log('Adding transaction:', transaction);
        
        // Generate unique ID
        transaction.id = 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        transaction.addedAt = new Date().toISOString();
        
        // Add to transactions array
        this.data.transactions.push(transaction);
        
        // Save to Drive
        await this.saveToDrive();
        
        return transaction;
    },

    /**
     * Update an existing transaction's fields
     */
    updateTransaction: async function(transactionId, updates) {
        const index = this.data.transactions.findIndex(t => t.id === transactionId);
        if (index === -1) throw new Error('Transaction not found');
        Object.assign(this.data.transactions[index], updates);
        await this.saveToDrive();
        return this.data.transactions[index];
    },

    /**
     * Delete a transaction
     */
    deleteTransaction: async function(transactionId) {
        console.log('Deleting transaction:', transactionId);
        
        // Find and remove the transaction
        const index = this.data.transactions.findIndex(t => t.id === transactionId);
        
        if (index === -1) {
            throw new Error('Transaction not found');
        }
        
        // Remove from array
        this.data.transactions.splice(index, 1);
        
        // Save to Drive
        await this.saveToDrive();
        
        console.log('✅ Transaction deleted');
    },
    
    /**
     * Mark a file as processed
     */
    markFileProcessed: async function(fileId) {
        if (!this.data.processedFiles.includes(fileId)) {
            this.data.processedFiles.push(fileId);
            await this.saveToDrive();
        }
    },
    
    /**
     * Check if file has been processed
     */
    isFileProcessed: function(fileId) {
        return this.data.processedFiles.includes(fileId);
    },
    
    /**
     * Add or update an account
     */
    addAccount: async function(accountId, accountData) {
        this.data.accounts[accountId] = accountData;
        await this.saveToDrive();
    },
    
    /**
     * Get all data
     */
    getData: function() {
        return this.data;
    },
    
    /**
     * Get all transactions
     */
    getTransactions: function() {
        return this.data.transactions;
    },
    
    /**
     * Get all accounts
     */
    getAccounts: function() {
        return this.data.accounts;
    },
    
    /**
     * Clear all data (use with caution!)
     */
    clearAllData: async function() {
        if (confirm('⚠️ Are you sure you want to delete ALL data? This cannot be undone!')) {
            this.data = {
                accounts: {},
                transactions: [],
                processedFiles: [],
                favorites: {},
                fxRates: {}
            };
            await this.saveToDrive();
            console.log('All data cleared');
            UI.showMessage('All data cleared', 'success');
        }
    },
    
    /**
     * Load test data (for development/testing only)
     */
    loadTestData: function() {
        console.log('🧪 Loading test data...');
        
        this.data = {
            accounts: {
                'schwab_12345': {
                    id: 'schwab_12345',
                    name: 'Schwab Joint Account',
                    accountNumber: 'XXXX-12345',
                    accountNumberLast4: '12345',
                    broker: 'Charles Schwab',
                    platform: 'schwab',
                    defaultCurrency: 'USD',
                    accountType: 'joint',
                    holders: ['Kenneth Ingram', 'Mathangi Ingram'],
                    isActive: true,
                    createdAt: '2024-01-15T10:00:00Z',
                    notes: 'Main US joint trading account'
                },
                'questrade_67890': {
                    id: 'questrade_67890',
                    name: 'Questrade TFSA',
                    accountNumber: 'QT-67890',
                    accountNumberLast4: '67890',
                    broker: 'Questrade',
                    platform: 'questrade',
                    defaultCurrency: 'CAD',
                    accountType: 'tfsa',
                    holders: ['Kenneth Ingram'],
                    isActive: true,
                    createdAt: '2024-02-01T10:00:00Z',
                    notes: 'Tax-free savings account'
                },
                'ibkr_99999': {
                    id: 'ibkr_99999',
                    name: 'Interactive Brokers Margin',
                    accountNumber: 'U9999999',
                    accountNumberLast4: '9999',
                    broker: 'Interactive Brokers',
                    platform: 'ibkr',
                    defaultCurrency: 'USD',
                    accountType: 'margin',
                    holders: ['Mathangi Ingram'],
                    isActive: false,
                    createdAt: '2023-12-01T10:00:00Z',
                    notes: 'Inactive - moved to Schwab'
                }
            },
            transactions: [
                {
                    id: 'txn_001',
                    accountId: 'schwab_12345',
                    date: '2024-01-15',
                    settlementDate: '2024-01-17',
                    type: 'buy',
                    symbol: 'AAPL',
                    company: 'Apple Inc.',
                    quantity: 100,
                    currency: 'USD',
                    price: 185.50,
                    fees: 5.00,
                    total: 18555.00,
                    fxRate: 1.35,
                    fxRateSource: 'contract',
                    fxRateDate: '2024-01-15',
                    baseCurrency: 'CAD',
                    priceInBase: 250.43,
                    feesInBase: 6.75,
                    totalInBase: 25049.25,
                    broker: 'Charles Schwab',
                    addedAt: '2024-01-16T10:30:00Z'
                },
                {
                    id: 'txn_002',
                    accountId: 'schwab_12345',
                    date: '2024-01-20',
                    settlementDate: '2024-01-22',
                    type: 'buy',
                    symbol: 'MSFT',
                    company: 'Microsoft Corporation',
                    quantity: 50,
                    currency: 'USD',
                    price: 402.30,
                    fees: 5.00,
                    total: 20120.00,
                    fxRate: 1.34,
                    fxRateSource: 'api',
                    fxRateDate: '2024-01-20',
                    baseCurrency: 'CAD',
                    priceInBase: 539.08,
                    feesInBase: 6.70,
                    totalInBase: 26960.80,
                    broker: 'Charles Schwab',
                    addedAt: '2024-01-21T09:15:00Z'
                },
                {
                    id: 'txn_003',
                    accountId: 'questrade_67890',
                    date: '2024-02-01',
                    settlementDate: '2024-02-03',
                    type: 'buy',
                    symbol: 'TD',
                    company: 'Toronto-Dominion Bank',
                    quantity: 200,
                    currency: 'CAD',
                    price: 78.50,
                    fees: 9.99,
                    total: 15709.99,
                    fxRate: 1.0,
                    fxRateSource: 'contract',
                    fxRateDate: '2024-02-01',
                    baseCurrency: 'CAD',
                    priceInBase: 78.50,
                    feesInBase: 9.99,
                    totalInBase: 15709.99,
                    broker: 'Questrade',
                    addedAt: '2024-02-02T11:00:00Z'
                },
                {
                    id: 'txn_004',
                    accountId: 'questrade_67890',
                    date: '2024-02-05',
                    settlementDate: '2024-02-07',
                    type: 'buy',
                    symbol: 'SHOP',
                    company: 'Shopify Inc.',
                    quantity: 75,
                    currency: 'CAD',
                    price: 95.20,
                    fees: 9.99,
                    total: 7149.99,
                    fxRate: 1.0,
                    fxRateSource: 'contract',
                    fxRateDate: '2024-02-05',
                    baseCurrency: 'CAD',
                    priceInBase: 95.20,
                    feesInBase: 9.99,
                    totalInBase: 7149.99,
                    broker: 'Questrade',
                    addedAt: '2024-02-06T14:30:00Z'
                },
                {
                    id: 'txn_005',
                    accountId: 'schwab_12345',
                    date: '2024-02-08',
                    settlementDate: '2024-02-10',
                    type: 'buy',
                    symbol: 'GOOGL',
                    company: 'Alphabet Inc.',
                    quantity: 30,
                    currency: 'USD',
                    price: 142.80,
                    fees: 5.00,
                    total: 4289.00,
                    fxRate: 1.36,
                    fxRateSource: 'api',
                    fxRateDate: '2024-02-08',
                    baseCurrency: 'CAD',
                    priceInBase: 194.21,
                    feesInBase: 6.80,
                    totalInBase: 5833.04,
                    broker: 'Charles Schwab',
                    addedAt: '2024-02-09T10:00:00Z'
                }
            ],
            processedFiles: [],
            favorites: {},
            fxRates: {},
            settings: {
                baseCurrency: 'CAD',
                createdAt: '2024-01-15T10:00:00Z'
            },
            created: '2024-01-15T10:00:00Z',
            version: '1.0.0'
        };
        
        this.isLoaded = true;
        
        console.log('✅ Test data loaded:', this.data);
        
        // Update the UI
        if (typeof UI !== 'undefined') {
            UI.updateOverview();
        }
    },

    /**
     * Add or update a favorite
     */
    addFavorite: async function(favoriteId, favoriteData) {
        this.data.favorites[favoriteId] = favoriteData;
        await this.saveToDrive();
    },
    
    /**
     * Delete a favorite
     */
    deleteFavorite: async function(favoriteId) {
        delete this.data.favorites[favoriteId];
        await this.saveToDrive();
    },
    
    /**
     * Get all favorites
     */
    getFavorites: function() {
        return this.data.favorites || {};
    },
    
    /**
     * Get a specific favorite
     */
    getFavorite: function(favoriteId) {
        return this.data.favorites[favoriteId] || null;
    },
};