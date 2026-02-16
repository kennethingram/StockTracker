// ===================================
// AUTH MODULE
// Handles Google OAuth authentication
// ===================================

const Auth = {
    // Store the access token here after login
    accessToken: null,
    
    // Store user info
    userEmail: null,
    
    /**
     * Initialize the authentication module
     * Sets up Google Sign-In button
     */
    init: function() {
        console.log('Auth module initializing...');
        
        // TEST MODE: Skip authentication
        if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
            console.log('🧪 TEST MODE: Bypassing authentication');
            this.accessToken = 'test_token_12345';
            this.userEmail = 'test@example.com';
            this.showDashboard();
            
            // Load test data
            if (typeof Database !== 'undefined') {
                Database.loadTestData();
            }
            return;
        }
        
        // Load the access token from browser storage (if user logged in before)
        this.loadTokenFromStorage();
        
        // Check if user is already logged in
        if (this.accessToken) {
            console.log('User already logged in');
            this.showDashboard();
        } else {
            console.log('User not logged in, showing login screen');
            this.showLoginScreen();
        }
        
        // Set up the Google Sign-In button click handler
        const signInBtn = document.getElementById('google-signin-btn');
        if (signInBtn) {
            signInBtn.addEventListener('click', () => this.signIn());
        }
        
        // Set up the Sign Out button click handler
        const signOutBtn = document.getElementById('signout-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.signOut());
        }
    },
    
    /**
     * Initiate Google Sign-In flow
     * Opens popup for user to authorize app
     */
    signIn: function() {
        console.log('Starting Google Sign-In...');
        
        // Check if Google Client ID is configured
        if (!CONFIG.googleClientId || CONFIG.googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            alert('⚠️ Google Client ID not configured yet!\n\nYou need to:\n1. Create a Google Cloud project\n2. Enable Drive API\n3. Get OAuth Client ID\n4. Add it to config.js');
            return;
        }
        
        // Create the OAuth client
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.googleClientId,
            scope: CONFIG.driveScopes,
            callback: (response) => {
                // This runs after user authorizes
                if (response.access_token) {
                    console.log('✅ Successfully signed in!');
                    this.handleAuthSuccess(response);
                } else {
                    console.error('❌ Sign-in failed');
                    alert('Sign-in failed. Please try again.');
                }
            },
        });
        
        // Request the access token (opens popup)
        client.requestAccessToken();
    },
    
    /**
     * Handle successful authentication
     * Save token and show dashboard
     */
    handleAuthSuccess: async function(response) {
        // Save the access token
        this.accessToken = response.access_token;
        
        // Save to browser storage so user stays logged in
        localStorage.setItem('google_access_token', this.accessToken);
        
        // Get user email from Google
        this.getUserInfo();
        
        // Show the dashboard
        this.showDashboard();
        
        // Initialize other modules now that we're authenticated
        if (typeof Database !== 'undefined') {
            await Database.init();
        }
        if (typeof Drive !== 'undefined') {
            await Drive.init();
        }
    },
    
    /**
     * Get user's email from Google
     */
    getUserInfo: async function() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            const data = await response.json();
            this.userEmail = data.email;
            
            // Display email in navbar
            const userEmailEl = document.getElementById('user-email');
            if (userEmailEl) {
                userEmailEl.textContent = this.userEmail;
            }
            
            console.log('User email:', this.userEmail);
        } catch (error) {
            console.error('Error getting user info:', error);
        }
    },
    
    /**
     * Sign out user
     * Clear token and show login screen
     */
    signOut: function() {
        console.log('Signing out...');
        
        // Clear the token
        this.accessToken = null;
        this.userEmail = null;
        
        // Remove from browser storage
        localStorage.removeItem('google_access_token');
        
        // Show login screen
        this.showLoginScreen();
        
        console.log('✅ Signed out successfully');
    },
    
    /**
     * Load saved token from browser storage
     */
    loadTokenFromStorage: function() {
        const savedToken = localStorage.getItem('google_access_token');
        if (savedToken) {
            this.accessToken = savedToken;
            console.log('Loaded saved access token');
        }
    },
    
    /**
     * Show the login screen
     */
    showLoginScreen: function() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('dashboard-screen').classList.remove('active');
    },
    
    /**
     * Show the dashboard
     */
    /**
     * Show the dashboard
     */
     showDashboard: async function() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
        
        // Get user info if we don't have it
        if (!this.userEmail && this.accessToken) {
            this.getUserInfo();
        }
        
        // Initialize database first (ensure it's ready)
        if (typeof Database !== 'undefined') {
            await Database.init();
        }
    },
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated: function() {
        return this.accessToken !== null;
    },
    
    /**
     * Get the current access token
     */
    getAccessToken: function() {
        return this.accessToken;
    }
};

// Initialize auth when page loads
// (This happens automatically because of the script tag order in index.html)