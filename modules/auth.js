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
        
        // Set up sign-out handlers (profile dropdown + legacy button if present)
        const signOutBtn = document.getElementById('signout-btn');
        if (signOutBtn) signOutBtn.addEventListener('click', () => this.signOut());
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
        // Save expiry time (tokens last ~1 hour; use 55 min to be safe)
        const expiresAt = Date.now() + (response.expires_in || 3600) * 1000 - 5 * 60 * 1000;
        localStorage.setItem('google_token_expires_at', expiresAt.toString());
        
        // Get user email from Google
        this.getUserInfo();
        
        // Show the dashboard (handles Database.init + UI refresh internally)
        await this.showDashboard();

        // Initialize Drive module (folder config) after DB is ready
        if (typeof Drive !== 'undefined') {
            Drive.init();
        }
    },
    
    /**
     * Get user's email and name from Google
     */
    getUserInfo: async function() {
        // Apply cached profile immediately (avoids flash of "?" on returning visits)
        this._applyStoredProfile();

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) {
                console.warn('getUserInfo: HTTP', response.status, '— using cached profile if available');
                return;
            }

            const data = await response.json();
            this.userEmail = data.email;
            const displayName = data.name || data.given_name || null;

            // Derive initials: prefer given+family name, fall back to email prefix
            let initials = '?';
            if (data.given_name && data.family_name) {
                initials = (data.given_name[0] + data.family_name[0]).toUpperCase();
            } else if (data.given_name) {
                initials = data.given_name.slice(0, 2).toUpperCase();
            } else if (data.email) {
                initials = data.email.split('@')[0].slice(0, 2).toUpperCase();
            }

            // Persist so returning users see initials immediately next session
            if (initials !== '?') {
                localStorage.setItem('profile_initials', initials);
                localStorage.setItem('profile_name', displayName || data.email || '');
                localStorage.setItem('profile_email', data.email || '');
            }

            this._applyProfile(initials, displayName || data.email, data.email);
            console.log('User info loaded:', data.email, '(initials:', initials + ')');
        } catch (error) {
            console.error('Error getting user info:', error);
        }
    },

    _applyStoredProfile: function() {
        const initials = localStorage.getItem('profile_initials');
        const name = localStorage.getItem('profile_name');
        const email = localStorage.getItem('profile_email');
        if (initials) this._applyProfile(initials, name, email);
    },

    _applyProfile: function(initials, displayName, email) {
        const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
        set('profile-initials', initials);
        set('profile-dropdown-initials', initials);
        set('profile-dropdown-name', displayName);
        set('profile-dropdown-email', email);
        set('sidebar-user-email', email);
        set('user-email', email);
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
        localStorage.removeItem('google_token_expires_at');
        localStorage.removeItem('profile_initials');
        localStorage.removeItem('profile_name');
        localStorage.removeItem('profile_email');
        
        // Show login screen
        this.showLoginScreen();
        
        console.log('✅ Signed out successfully');
    },
    
    /**
     * Called when a Drive API returns 401 — token expired mid-session
     * Clears auth state and shows login screen with a message
     */
    handleTokenExpired: function() {
        console.warn('Auth token expired during API call — redirecting to login');
        this.accessToken = null;
        this.userEmail = null;
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expires_at');
        this.showLoginScreen();
        const msgEl = document.getElementById('session-expired-msg');
        if (msgEl) msgEl.style.display = 'block';
    },

    /**
     * Load saved token from browser storage
     * Returns false if token is expired or missing
     */
    loadTokenFromStorage: function() {
        const savedToken = localStorage.getItem('google_access_token');
        const expiresAt = localStorage.getItem('google_token_expires_at');
        if (savedToken) {
            if (expiresAt && Date.now() > parseInt(expiresAt)) {
                // Token expired — clear it so login screen shows
                localStorage.removeItem('google_access_token');
                localStorage.removeItem('google_token_expires_at');
                console.log('Stored token expired, cleared');
                return false;
            }
            this.accessToken = savedToken;
            console.log('Loaded saved access token');
            return true;
        }
        return false;
    },
    
    /**
     * Show the login screen
     */
    showLoginScreen: function() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('dashboard-screen').classList.remove('active');
    },
    
    /**
     * Show the dashboard and load initial view data
     */
     showDashboard: async function() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');

        // Clear session-expired notice if it was shown
        const expiredMsg = document.getElementById('session-expired-msg');
        if (expiredMsg) expiredMsg.style.display = 'none';

        // Get user info if we don't have it
        if (!this.userEmail && this.accessToken) {
            this.getUserInfo();
        }

        // Load database, show loading state while waiting
        if (typeof Database !== 'undefined') {
            if (typeof UI !== 'undefined') UI.showLoading('Loading portfolio...');
            try {
                await Database.init();
            } finally {
                if (typeof UI !== 'undefined') UI.hideLoading();
            }
            // Only refresh UI if we're still on the dashboard (token expiry redirects back to login)
            if (this.accessToken && typeof UI !== 'undefined') {
                UI.loadViewData(UI.currentView || 'overview');
            }
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