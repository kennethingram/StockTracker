// ===================================
// DRIVE MODULE
// Handles Google Drive integration
// ===================================

const Drive = {
    // Selected folder ID for contract notes
    contractNotesFolderId: null,
    
    // Cache of files in the folder
    filesCache: [],
    
    /**
     * Initialize Drive module
     */
     init: async function() {
        console.log('Drive module initializing...');
        
        // Wait a moment for database to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Load saved folder ID from config or database
        this.loadFolderConfig();
    },
    
    /**
     * Load folder configuration
     */
    loadFolderConfig: function() {
        console.log('loadFolderConfig called');
        
        // Try to get from config first
        if (CONFIG.contractNotesFolderId) {
            this.contractNotesFolderId = CONFIG.contractNotesFolderId;
            console.log('✅ Loaded folder ID from config:', this.contractNotesFolderId);
            return;
        }
        
        // Try to get from database settings
        if (typeof Database !== 'undefined' && Database.isLoaded) {
            const data = Database.getData();
            console.log('Checking database settings:', data.settings);
            
            if (data && data.settings && data.settings.contractNotesFolderId) {
                this.contractNotesFolderId = data.settings.contractNotesFolderId;
                console.log('✅ Loaded folder ID from database:', this.contractNotesFolderId);
            } else {
                console.log('⚠️ No folder ID found in database settings');
            }
        } else {
            console.log('⚠️ Database not ready for loading folder config');
        }
    },
    
    /**
     * Save folder ID to database
     */
     saveFolderConfig: async function(folderId) {
        console.log('saveFolderConfig called with:', folderId);
        this.contractNotesFolderId = folderId;
        
        if (typeof Database !== 'undefined' && Database.isLoaded) {
            try {
                const data = Database.getData();
                console.log('Current data.settings:', data.settings);
                
                if (!data.settings) {
                    data.settings = {};
                }
                data.settings.contractNotesFolderId = folderId;
                
                console.log('Updated data.settings:', data.settings);
                
                await Database.saveToDrive();
                console.log('✅ Saved folder ID to database successfully');
            } catch (error) {
                console.error('❌ Error saving folder config:', error);
            }
        } else {
            console.warn('⚠️ Database not ready, folder ID not saved');
            console.log('Database exists?', typeof Database !== 'undefined');
            console.log('Database loaded?', Database ? Database.isLoaded : 'N/A');
        }
    },
    
   /**
     * Open the styled folder selection modal
     */
     selectFolder: function() {
        if (!Auth.isAuthenticated()) {
            UI.showMessage('Please sign in first', 'error');
            return;
        }
        UI.showFolderModal();
    },

    /**
     * Verify a folder ID and save it if valid
     * Called by UI.saveFolderFromModal()
     */
    verifyAndSaveFolder: async function(folderId) {
        UI.showLoading('Verifying folder...');

        try {
            const folderInfo = await this.getFolderInfo(folderId);

            if (folderInfo) {
                if (typeof Database !== 'undefined' && !Database.isLoaded) {
                    await Database.init();
                }

                await this.saveFolderConfig(folderId);
                UI.hideLoading();
                UI.showMessage(`Folder "${folderInfo.name}" connected successfully`, 'success');

                if (typeof UI !== 'undefined' && UI.updateSyncView) UI.updateSyncView();
                if (typeof UI !== 'undefined' && UI.updateAdminView) UI.updateAdminView();

                return folderId;
            } else {
                UI.hideLoading();
                UI.showMessage('Could not access folder. Check the folder ID and permissions.', 'error');
            }
        } catch (error) {
            UI.hideLoading();
            console.error('Error verifying folder:', error);
            UI.showMessage('Error accessing folder: ' + error.message, 'error');
        }
    },
    
    /**
     * Get folder information
     */
    getFolderInfo: async function(folderId) {
        const token = Auth.getAccessToken();
        
        const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to access folder');
        }
    },
    
    /**
     * List all PDF files in the contract notes folder
     */
    listContractNotes: async function() {
        if (!this.contractNotesFolderId) {
            console.log('No folder configured');
            return [];
        }
        
        const token = Auth.getAccessToken();
        
        // Query for PDF files in the folder
        const query = `'${this.contractNotesFolderId}' in parents and mimeType='application/pdf' and trashed=false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=createdTime desc`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.filesCache = data.files || [];
                console.log(`Found ${this.filesCache.length} PDF files in folder`);
                return this.filesCache;
            } else {
                throw new Error('Failed to list files');
            }
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    },
    
    /**
     * Get unprocessed files
     */
    getUnprocessedFiles: async function() {
        const allFiles = await this.listContractNotes();
        
        if (typeof Database === 'undefined') {
            return allFiles;
        }
        
        const data = Database.getData();
        const processedFileIds = data.processedFiles || [];
        
        // Filter out already processed files
        const unprocessed = allFiles.filter(file => !processedFileIds.includes(file.id));
        
        console.log(`${unprocessed.length} unprocessed files out of ${allFiles.length} total`);
        
        return unprocessed;
    },
    
    /**
     * Download a PDF file from Drive
     */
    downloadFile: async function(fileId) {
        const token = Auth.getAccessToken();
        
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                console.log(`Downloaded file ${fileId}, size: ${blob.size} bytes`);
                return blob;
            } else {
                throw new Error('Failed to download file');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    },
    
    /**
     * Get file metadata
     */
    getFileInfo: async function(fileId) {
        const token = Auth.getAccessToken();
        
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,createdTime,modifiedTime,size,mimeType`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to get file info');
            }
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }
};