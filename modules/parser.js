// ===================================
// PARSER MODULE
// Extracts transaction data from contract notes
// ===================================

const Parser = {
    
    /**
     * Process a contract note PDF file
     * Returns structured transaction data
     */
     processContractNote: async function(fileId, fileName) {
        console.log('Processing contract note:', fileName);
        
        UI.showLoading(`Processing ${fileName}...`);
        
        try {
            // Step 1: Download the PDF from Drive
            console.log('Downloading PDF...');
            const pdfBlob = await Drive.downloadFile(fileId);
            
            // Step 2: Extract text from PDF
            console.log('Extracting text from PDF...');
            const pdfText = await this.extractTextFromPDF(pdfBlob);
            
            console.log('Extracted text length:', pdfText.length, 'characters');
            
            // Step 3: Parse the transaction data
            let transactions;
            
            // Check if PDF has text or is image-based
            const hasText = pdfText && pdfText.trim().length > 100 && 
                           !pdfText.includes('NO TEXT EXTRACTED');
            
            if (hasText) {
                // Text-based PDF - use regular parsing
                console.log('PDF has text layer - using text parsing...');
                transactions = await this.parseTransactionData(pdfText, fileName);
            } else {
                // Image-based PDF - use Gemini Vision
                console.log('PDF appears to be image-based - using Vision API...');
                transactions = await this.parseImagePDF(pdfBlob, fileName);
            }
            
            // Step 4: Save all validated transactions to database
            console.log(`Saving ${transactions.length} transaction(s)...`);
            
            for (const transaction of transactions) {
                // Add missing fields with defaults
                const completeTransaction = {
                    ...transaction,
                    accountId: transaction.accountId || null,
                    settlementDate: transaction.settlementDate || transaction.date,
                    fxRate: transaction.fxRate || 1.0,
                    fxRateSource: transaction.fxRateSource || 'manual',
                    fxRateDate: transaction.fxRateDate || transaction.date,
                    baseCurrency: CONFIG.baseCurrency,
                    priceInBase: transaction.price * (transaction.fxRate || 1.0),
                    feesInBase: transaction.fees * (transaction.fxRate || 1.0),
                    totalInBase: transaction.total * (transaction.fxRate || 1.0),
                    broker: transaction.broker || '',
                    contractNoteFile: fileName,
                    contractNoteId: fileId
                };
                
                await Database.addTransaction(completeTransaction);
            }
            
            // Step 5: Mark file as processed
            await Database.markFileProcessed(fileId);
            
            UI.hideLoading();
            UI.showMessage(`Successfully processed ${transactions.length} transaction(s) from: ${fileName}`, 'success');
            
            return transactions;
            
        } catch (error) {
            UI.hideLoading();
            console.error('Error processing contract note:', error);
            UI.showMessage(`Error processing ${fileName}: ${error.message}`, 'error');
            throw error;
        }
    },
    
    /**
     * Extract text from PDF blob
     * Uses PDF.js library
     */
    
     extractTextFromPDF: async function(pdfBlob) {
        try {
            console.log('Starting PDF text extraction...');
            console.log('PDF blob size:', pdfBlob.size, 'bytes');
            
            // Convert blob to array buffer
            const arrayBuffer = await pdfBlob.arrayBuffer();
            console.log('Converted to array buffer, size:', arrayBuffer.byteLength);
            
            // Load PDF with PDF.js
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
            
            let fullText = '';
            
            // Extract text from each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                console.log(`Processing page ${pageNum}...`);
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                console.log(`Page ${pageNum} has ${textContent.items.length} text items`);
                
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                
                console.log(`Page ${pageNum} extracted text length:`, pageText.length);
                console.log(`Page ${pageNum} text preview:`, pageText.substring(0, 200));
                
                fullText += pageText + '\n\n';
            }
            
            console.log('Total extracted text length:', fullText.length);
            console.log('First 500 chars:', fullText.substring(0, 500));
            
            // Check if we got any text
            if (!fullText || fullText.trim().length === 0) {
                console.warn('No text extracted - PDF might be image-based or empty');
                // Return a placeholder so user can still manually enter data
                return 'NO TEXT EXTRACTED - This PDF appears to be image-based or empty. Please enter transaction details manually.';
            }
            
            return fullText.trim();
            
        } catch (error) {
            console.error('Detailed PDF extraction error:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            throw new Error('Failed to extract text from PDF: ' + error.message);
        }
    },
    /**
     * Parse transaction data from extracted text using Gemini AI
     * Shows validation UI before saving
     */
     parseTransactionData: async function(pdfText, fileName) {
        console.log('Parsing with Gemini AI...');
        
        try {
            // Call Gemini API
            const result = await this.callGeminiAPI(pdfText, fileName);
            
            if (result && result.transactions && result.transactions.length > 0) {
                console.log('✅ Gemini parsed successfully:', result.transactions);
                
                // Show validation UI (human-in-the-loop)
                const validatedTransactions = await this.showValidationUI(result.transactions, pdfText, fileName);
                
                return validatedTransactions;
            } else {
                throw new Error('Gemini did not return valid transaction data');
            }
            
        } catch (error) {
            console.error('Gemini parsing failed:', error);
            console.log('Falling back to manual entry...');
            
            // Fall back to manual entry if Gemini fails
            const transaction = await this.promptForTransactionData(pdfText, fileName);
            return [transaction];
        }
    },
    
    /**
     * Get list of available Gemini models
     * Auto-discovers the best model to use
     */
     getAvailableModels: async function() {
        const apiKey = CONFIG.geminiApiKey;
        
        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Gemini API key not configured');
        }
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        
        console.log('Fetching available Gemini models...');
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to list models: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Available models:', data);
            
            // Filter for models that support generateContent
            const compatibleModels = data.models.filter(model => 
                model.supportedGenerationMethods && 
                model.supportedGenerationMethods.includes('generateContent')
            );
            
            console.log('Compatible models for generateContent:', compatibleModels);
            
            // Prioritize models (prefer flash for speed and cost)
            const flashModels = compatibleModels.filter(m => m.name.includes('flash'));
            const proModels = compatibleModels.filter(m => m.name.includes('pro'));
            
            let selectedModel = null;
            
            if (flashModels.length > 0) {
                // Prefer latest flash model
                selectedModel = flashModels[flashModels.length - 1];
                console.log('✅ Selected Flash model (fast & free):', selectedModel.name);
            } else if (proModels.length > 0) {
                // Fall back to pro model
                selectedModel = proModels[proModels.length - 1];
                console.log('✅ Selected Pro model:', selectedModel.name);
            } else if (compatibleModels.length > 0) {
                // Use any compatible model
                selectedModel = compatibleModels[0];
                console.log('✅ Selected first compatible model:', selectedModel.name);
            } else {
                throw new Error('No compatible models found for generateContent');
            }
            
            return selectedModel.name;
            
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    },

    /**
     * Call Gemini API to parse contract note
     * Can extract multiple transactions from one contract note
     */
    
     callGeminiAPI: async function(contractNoteText, fileName) {
        const apiKey = CONFIG.geminiApiKey;
        
        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Gemini API key not configured');
        }
        
        // Auto-discover best available model
        let modelName;
        try {
            modelName = await this.getAvailableModels();
        } catch (error) {
            console.error('Model discovery failed, using fallback:', error);
            // Fallback to a known model
            modelName = 'models/gemini-pro';
        }
        
        console.log('Using model:', modelName);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
    
            // Create the prompt
        const prompt = `You are a financial data extraction assistant. Extract ALL transaction details from this contract note.

IMPORTANT: A single contract note may contain MULTIPLE transactions. Extract each one separately.

CONTRACT NOTE TEXT:
${contractNoteText}

Extract the following information and return ONLY valid JSON (no markdown, no explanation):

{
  "transactions": [
    {
      "contractReference": "contract/trade reference number from the document",
      "date": "YYYY-MM-DD format",
      "settlementDate": "YYYY-MM-DD format if available, otherwise same as date",
      "type": "buy or sell",
      "symbol": "stock ticker symbol",
      "company": "company name",
      "quantity": number,
      "price": number (price per share),
      "currency": "3-letter currency code (USD, CAD, GBP, etc)",
      "fees": number (commission/fees),
      "total": number (total amount),
      "accountLast4": "last 4 digits of account number if present"
    }
  ]
}

IMPORTANT:
- If there are MULTIPLE transactions in the contract note, include ALL of them in the transactions array
- Each transaction should have its own contractReference if available
- Return ONLY the JSON object, nothing else
- Use null if a field cannot be determined
- Ensure all numbers are actual numbers, not strings
- Currency must be 3-letter code (USD, CAD, GBP, EUR, INR, etc)
- Type must be exactly "buy" or "sell"`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192
            }
        };
        
        console.log('Calling Gemini API...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        //console.log('Gemini API response:', data); // Commented out to reduce noise, can be re-enabled for debugging
        
        // Extract the text from Gemini's response
        const geminiText = data.candidates[0].content.parts[0].text;
        //console.log('Gemini response text:', geminiText); // Commented out to reduce noise, can be re-enabled for debugging
        
        // Remove markdown code blocks
        let jsonText = geminiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Try to parse, if it fails, attempt to repair truncated JSON
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (error) {
            console.warn('Initial JSON parse failed, attempting to repair...', error);
            
            // Attempt to repair truncated JSON
            let repairedJson = jsonText;
            
            // Count opening and closing brackets
            const openBraces = (repairedJson.match(/{/g) || []).length;
            const closeBraces = (repairedJson.match(/}/g) || []).length;
            const openBrackets = (repairedJson.match(/\[/g) || []).length;
            const closeBrackets = (repairedJson.match(/\]/g) || []).length;
            
            // Add missing closing brackets
            for (let i = 0; i < (openBrackets - closeBrackets); i++) {
                repairedJson += '\n]';
            }
            for (let i = 0; i < (openBraces - closeBraces); i++) {
                repairedJson += '\n}';
            }
            
            console.log('Repaired JSON:', repairedJson);
            
            try {
                parsed = JSON.parse(repairedJson);
                console.log('✅ Successfully repaired and parsed JSON');
            } catch (repairError) {
                console.error('Failed to repair JSON:', repairError);
                throw new Error('Could not parse or repair Gemini response JSON');
            }
        }
        
        return parsed;
    },
    
    /**
     * Parse image-based PDF using Gemini Vision API
     */
    parseImagePDF: async function(pdfBlob, fileName) {
        console.log('Converting PDF to image for Vision API...');
        
        try {
            // Convert PDF to image
            const imageData = await this.convertPDFToImage(pdfBlob);
            
            // Call Gemini Vision API
            const result = await this.callGeminiVisionAPI(imageData, fileName);
            
            if (result && result.transactions && result.transactions.length > 0) {
                console.log('✅ Gemini Vision parsed successfully:', result.transactions);
                
                // Show validation UI
                const validatedTransactions = await this.showValidationUI(result.transactions, 'Image-based PDF', fileName);
                
                return validatedTransactions;
            } else {
                throw new Error('Gemini Vision did not return valid transaction data');
            }
            
        } catch (error) {
            console.error('Gemini Vision parsing failed:', error);
            console.log('Falling back to manual entry...');
            
            // Fall back to manual entry
            const transaction = await this.promptForTransactionData('Image-based PDF - no text extracted', fileName);
            return [transaction];
        }
    },
    
    /**
     * Convert PDF blob to base64 image for Vision API
     */
    convertPDFToImage: async function(pdfBlob) {
        console.log('Converting PDF to base64...');
        
        // For now, just convert the PDF blob to base64
        // Vision API can handle PDF directly
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        return base64;
    },
    
    /**
     * Call Gemini Vision API for image/PDF
     */
    callGeminiVisionAPI: async function(base64Data, fileName) {
        const apiKey = CONFIG.geminiApiKey;
        
        // Auto-discover best available model
        let modelName;
        try {
            modelName = await this.getAvailableModels();
        } catch (error) {
            console.error('Model discovery failed, using fallback:', error);
            modelName = 'models/gemini-pro-vision';
        }
        
        console.log('Using Vision model:', modelName);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
        
        const prompt = `You are a financial data extraction assistant. Extract ALL transaction details from this contract note image/PDF.

IMPORTANT: A single contract note may contain MULTIPLE transactions. Extract each one separately.

Extract the following information and return ONLY valid JSON (no markdown, no explanation):

{
  "transactions": [
    {
      "contractReference": "contract/trade reference number from the document",
      "date": "YYYY-MM-DD format",
      "settlementDate": "YYYY-MM-DD format if available, otherwise same as date",
      "type": "buy or sell",
      "symbol": "stock ticker symbol",
      "company": "company name",
      "quantity": number,
      "price": number (price per share),
      "currency": "3-letter currency code (USD, CAD, GBP, etc)",
      "fees": number (commission/fees),
      "total": number (total amount),
      "accountLast4": "last 4 digits of account number if present"
    }
  ]
}

IMPORTANT:
- If there are MULTIPLE transactions, include ALL of them in the transactions array
- Each transaction should have its own contractReference if available
- Return ONLY the JSON object, nothing else
- Use null if a field cannot be determined
- Ensure all numbers are actual numbers, not strings
- Currency must be 3-letter code (USD, CAD, GBP, EUR, INR, etc)
- Type must be exactly "buy" or "sell"`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'application/pdf',
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192
            }
        };
        
        console.log('Calling Gemini Vision API...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini Vision API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        //console.log('Gemini Vision API response:', data); // Commented out to reduce noise, can be re-enabled for debugging
        
        const geminiText = data.candidates[0].content.parts[0].text;
        //console.log('Gemini Vision response text:', geminiText); // Commented out to reduce noise, can be re-enabled for debugging
        
        // Remove markdown code blocks
        let jsonText = geminiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Try to parse, if it fails, attempt to repair truncated JSON
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (error) {
            console.warn('Initial JSON parse failed, attempting to repair...', error);
            
            // Attempt to repair truncated JSON by adding missing closing brackets
            let repairedJson = jsonText;
            
            // Count opening and closing brackets
            const openBraces = (repairedJson.match(/{/g) || []).length;
            const closeBraces = (repairedJson.match(/}/g) || []).length;
            const openBrackets = (repairedJson.match(/\[/g) || []).length;
            const closeBrackets = (repairedJson.match(/\]/g) || []).length;
            
            // Add missing closing brackets
            for (let i = 0; i < (openBrackets - closeBrackets); i++) {
                repairedJson += '\n]';
            }
            for (let i = 0; i < (openBraces - closeBraces); i++) {
                repairedJson += '\n}';
            }
            
            console.log('Repaired JSON:', repairedJson);
            
            try {
                parsed = JSON.parse(repairedJson);
                console.log('✅ Successfully repaired and parsed JSON');
            } catch (repairError) {
                console.error('Failed to repair JSON:', repairError);
                throw new Error('Could not parse or repair Gemini response JSON');
            }
        }
        
        return parsed;
    },


    /**
     * Prompt user to manually enter transaction data
     * This is a temporary solution until we implement Claude API
     */
    promptForTransactionData: async function(pdfText, fileName) {
        return new Promise((resolve, reject) => {
            // Create a modal form for manual data entry
            const modal = this.createTransactionEntryModal(pdfText, fileName, resolve, reject);
            document.body.appendChild(modal);
        });
    },
    
    /**
     * Create modal for manual transaction entry
     */
    createTransactionEntryModal: function(pdfText, fileName, resolve, reject) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>Enter Transaction Data</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove(); location.reload();">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
                        <strong>Extracted Text (first 500 chars):</strong>
                        <pre style="white-space: pre-wrap; font-size: 0.85em; margin-top: 10px;">${pdfText.substring(0, 500)}...</pre>
                    </div>
                    
                    <form id="transaction-entry-form">
                        <div class="form-group">
                            <label>Account *</label>
                            <select id="txn-account" required>
                                <option value="">Select account...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Transaction Date *</label>
                            <input type="date" id="txn-date" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Type *</label>
                            <select id="txn-type" required>
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Symbol *</label>
                            <input type="text" id="txn-symbol" required placeholder="e.g., AAPL">
                        </div>
                        
                        <div class="form-group">
                            <label>Company Name</label>
                            <input type="text" id="txn-company" placeholder="e.g., Apple Inc.">
                        </div>
                        
                        <div class="form-group">
                            <label>Quantity *</label>
                            <input type="number" id="txn-quantity" required step="1" min="1">
                        </div>
                        
                        <div class="form-group">
                            <label>Price per Share *</label>
                            <input type="number" id="txn-price" required step="0.01" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label>Currency *</label>
                            <select id="txn-currency" required>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Fees</label>
                            <input type="number" id="txn-fees" step="0.01" min="0" value="0">
                        </div>
                        
                        <div class="form-group">
                            <label>FX Rate (to base currency)</label>
                            <input type="number" id="txn-fx-rate" step="0.0001" placeholder="e.g., 1.35">
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove(); location.reload();">Cancel</button>
                            <button type="submit" class="btn-primary">Save Transaction</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Populate account dropdown
        if (typeof Database !== 'undefined') {
            const data = Database.getData();
            const accountSelect = modal.querySelector('#txn-account');
            Object.values(data.accounts || {}).forEach(acc => {
                const option = document.createElement('option');
                option.value = acc.id;
                option.textContent = acc.name;
                accountSelect.appendChild(option);
            });
        }
        
        // Populate currency dropdown
        const currencySelect = modal.querySelector('#txn-currency');
        CONFIG.supportedCurrencies.forEach(curr => {
            const option = document.createElement('option');
            option.value = curr.code;
            option.textContent = `${curr.name} (${curr.code})`;
            if (curr.code === CONFIG.baseCurrency) {
                option.selected = true;
            }
            currencySelect.appendChild(option);
        });
        
        // Handle form submission
        const form = modal.querySelector('#transaction-entry-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const accountId = document.getElementById('txn-account').value;
            const date = document.getElementById('txn-date').value;
            const type = document.getElementById('txn-type').value;
            const symbol = document.getElementById('txn-symbol').value.toUpperCase();
            const company = document.getElementById('txn-company').value;
            const quantity = parseFloat(document.getElementById('txn-quantity').value);
            const price = parseFloat(document.getElementById('txn-price').value);
            const currency = document.getElementById('txn-currency').value;
            const fees = parseFloat(document.getElementById('txn-fees').value) || 0;
            const fxRate = parseFloat(document.getElementById('txn-fx-rate').value) || 1.0;
            
            // Calculate totals
            const total = (quantity * price) + fees;
            const totalInBase = total * fxRate;
            const priceInBase = price * fxRate;
            const feesInBase = fees * fxRate;
            
            // Get account info for broker
            const data = Database.getData();
            const account = data.accounts[accountId];
            
            const transaction = {
                accountId: accountId,
                date: date,
                type: type,
                symbol: symbol,
                company: company || symbol,
                quantity: quantity,
                currency: currency,
                price: price,
                fees: fees,
                total: total,
                fxRate: fxRate,
                fxRateSource: 'manual',
                fxRateDate: date,
                baseCurrency: CONFIG.baseCurrency,
                priceInBase: priceInBase,
                feesInBase: feesInBase,
                totalInBase: totalInBase,
                broker: account ? account.broker : '',
                contractNoteFile: fileName
            };
            
            modal.remove();
            resolve(transaction);
        });
        
        return modal;
    },

    /**
     * Show validation UI for human review
     * Returns array of validated transactions
     */
    showValidationUI: async function(transactions, sourceText, fileName) {
        return new Promise((resolve, reject) => {
            const modal = this.createValidationModal(transactions, sourceText, fileName, resolve, reject);
            document.body.appendChild(modal);
        });
    },
    
    /**
     * Create validation modal with editable transaction table
     */
    createValidationModal: function(transactions, sourceText, fileName, resolve, reject) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '10000';
        
        // Build table HTML
        let tableHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f7fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Status</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Account *</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">PDF Account</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Contract Ref</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Date</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Type</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Symbol</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Quantity</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Price</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Currency</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Fees</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Total</th>
                        <th style="padding: 12px; text-align: left; font-size: 0.9em;">Actions</th>
                    </tr>
                </thead>
                <tbody id="validation-table-body">
        `;
        
        transactions.forEach((txn, index) => {
            tableHTML += `
                <tr id="txn-row-${index}" style="border-bottom: 1px solid #e2e8f0;" data-index="${index}">
                    <td style="padding: 12px;">
                        <span class="status-badge" id="status-${index}" style="background: #fbbf24; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Pending</span>
                    </td>
                    <td style="padding: 12px;">
                        <select id="account-${index}" required style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                            <option value="">Select account...</option>
                        </select>
                    </td>
                    <td style="padding: 12px;">
                        <span id="pdf-account-${index}" style="font-family: monospace; font-size: 0.95em;">
                            ${txn.accountLast4 ? '****' + txn.accountLast4 : 'N/A'}
                        </span>
                        <span id="match-badge-${index}" style="margin-left: 8px;"></span>
                    </td>
                    <td style="padding: 12px;">
                        <input type="text" id="contractRef-${index}" value="${txn.contractReference || ''}" 
                               style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                    </td>
                    <td style="padding: 12px;">
                        <input type="date" id="date-${index}" value="${txn.date || ''}" 
                               style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                    </td>
                    <td style="padding: 12px;">
                        <select id="type-${index}" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                            <option value="buy" ${txn.type === 'buy' ? 'selected' : ''}>Buy</option>
                            <option value="sell" ${txn.type === 'sell' ? 'selected' : ''}>Sell</option>
                        </select>
                    </td>
                    <td style="padding: 12px;">
                        <input type="text" id="symbol-${index}" value="${txn.symbol || ''}" 
                               style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                    </td>
                    <td style="padding: 12px;">
                        <input type="number" id="quantity-${index}" value="${txn.quantity || ''}" 
                               style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                    </td>
                    <td style="padding: 12px;">
                        <input type="number" id="price-${index}" value="${txn.price || ''}" step="0.01" 
                               style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                    </td>
                    <td style="padding: 12px;">
                        <select id="currency-${index}" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                            ${CONFIG.supportedCurrencies.map(c => 
                                `<option value="${c.code}" ${txn.currency === c.code ? 'selected' : ''}>${c.code}</option>`
                            ).join('')}
                        </select>
                    </td>
                    <td style="padding: 12px;">
                        <input type="number" id="fees-${index}" value="${txn.fees || 0}" step="0.01" 
                               style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                    </td>
                    <td style="padding: 12px;">
                        <input type="number" id="total-${index}" value="${txn.total || ''}" step="0.01" 
                               style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.9em;">
                    </td>
                    <td style="padding: 12px;">
                        <button class="btn-secondary btn-small" onclick="Parser.acceptTransaction(${index})" style="margin-right: 5px;">✓ Accept</button>
                        <button class="btn-secondary btn-small danger" onclick="Parser.rejectTransaction(${index})">✗ Reject</button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 95%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>Review & Validate Transactions</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove(); location.reload();">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <strong>📄 Source File:</strong> ${fileName}<br>
                        <details style="margin-top: 10px;">
                            <summary style="cursor: pointer; color: #667eea; font-weight: 600;">View Extracted Text (first 800 chars)</summary>
                            <pre style="white-space: pre-wrap; font-size: 0.85em; margin-top: 10px; max-height: 200px; overflow-y: auto; background: white; padding: 10px; border-radius: 4px;">${sourceText.substring(0, 800)}...</pre>
                        </details>
                    </div>
                    
                    <div style="background: #eef2ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                        <strong>💡 Instructions:</strong>
                        <ul style="margin: 10px 0 0 20px; font-size: 0.9em;">
                            <li>Review each transaction extracted by AI</li>
                            <li>Edit any incorrect fields directly in the table</li>
                            <li>Click "✓ Accept" to approve or "✗ Reject" to skip</li>
                            <li>Only accepted transactions will be saved</li>
                        </ul>
                    </div>
                    
                    ${tableHTML}
                    
                    <div class="form-actions" style="margin-top: 30px;">
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove(); location.reload();">Cancel All</button>
                        <button type="button" class="btn-primary" id="save-validated-btn">💾 Save Accepted Transactions</button>
                    </div>
                </div>
            </div>
        `;
        
        // Track transaction states
        modal.transactionStates = transactions.map(() => 'pending');
        modal.transactions = transactions;
        modal.fileName = fileName;
        modal.resolveFunc = resolve;
        
        // Populate account dropdowns for each transaction
        setTimeout(() => {
            const data = Database.getData();
            const accounts = Object.values(data.accounts || {});
            
            // Check if any accounts exist
            if (accounts.length === 0) {
                alert('⚠️ No accounts found! Please create at least one account in the Accounts tab before processing contract notes.');
                modal.remove();
                reject(new Error('No accounts available'));
                return;
            }
            
            // Populate each transaction's account dropdown
            transactions.forEach((txn, index) => {
                const accountSelect = document.getElementById(`account-${index}`);
                const matchBadge = document.getElementById(`match-badge-${index}`);
                
                if (!accountSelect) return;
                
                // Find matching accounts based on accountLast4
                const pdfLast4 = txn.accountLast4;
                const matchingAccounts = [];
                
                accounts.forEach(acc => {
                    const option = document.createElement('option');
                    option.value = acc.id;
                    
                    // Check if this account matches the PDF's last 4 digits
                    const accLast4 = acc.accountNumberLast4 || acc.accountNumber?.slice(-4);
                    const isMatch = pdfLast4 && accLast4 === pdfLast4;
                    
                    if (isMatch) {
                        matchingAccounts.push(acc.id);
                        option.textContent = `${acc.name} (****${accLast4}) ✓ MATCH`;
                        option.style.background = '#c6f6d5';
                        option.style.fontWeight = '600';
                    } else {
                        option.textContent = `${acc.name}${accLast4 ? ' (****' + accLast4 + ')' : ''}`;
                    }
                    
                    accountSelect.appendChild(option);
                });
                
                // Update match badge
                if (matchBadge) {
                    if (!pdfLast4) {
                        matchBadge.innerHTML = '<span style="color: #a0aec0; font-size: 0.85em;">⚠️ No account info in PDF</span>';
                    } else if (matchingAccounts.length === 0) {
                        matchBadge.innerHTML = '<span style="color: #f56565; font-size: 0.85em; font-weight: 600;">⚠️ No match found</span>';
                    } else if (matchingAccounts.length === 1) {
                        // Auto-select the matching account
                        accountSelect.value = matchingAccounts[0];
                        matchBadge.innerHTML = '<span style="color: #48bb78; font-size: 0.85em; font-weight: 600;">✅ Auto-matched</span>';
                    } else {
                        matchBadge.innerHTML = '<span style="color: #ed8936; font-size: 0.85em; font-weight: 600;">⚠️ Multiple matches - please verify</span>';
                    }
                }
            });
            
            // Set up save button
            const saveBtn = modal.querySelector('#save-validated-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.saveValidatedTransactions(modal));
            }
        }, 100);
        
        return modal;
    },
    
    /**
     * Accept a transaction
     */
    acceptTransaction: function(index) {
        const statusBadge = document.getElementById(`status-${index}`);
        const row = document.getElementById(`txn-row-${index}`);
        
        if (statusBadge) {
            statusBadge.textContent = 'Accepted';
            statusBadge.style.background = '#10b981';
            row.style.background = '#f0fdf4';
        }
        
        // Find the modal and update state
        const modal = document.querySelector('.modal.active');
        if (modal && modal.transactionStates) {
            modal.transactionStates[index] = 'accepted';
        }
    },
    
    /**
     * Reject a transaction
     */
    rejectTransaction: function(index) {
        const statusBadge = document.getElementById(`status-${index}`);
        const row = document.getElementById(`txn-row-${index}`);
        
        if (statusBadge) {
            statusBadge.textContent = 'Rejected';
            statusBadge.style.background = '#ef4444';
            row.style.background = '#fef2f2';
        }
        
        // Find the modal and update state
        const modal = document.querySelector('.modal.active');
        if (modal && modal.transactionStates) {
            modal.transactionStates[index] = 'rejected';
        }
    },
    
    /**
     * Save all accepted transactions
     */
    saveValidatedTransactions: function(modal) {
        console.log('saveValidatedTransactions called');
        console.log('Transaction states:', modal.transactionStates);
        
        const acceptedTransactions = [];
        let allValid = true;
        
        modal.transactionStates.forEach((state, index) => {
            console.log(`Transaction ${index}: state = ${state}`);
            if (state === 'accepted') {
                
                // Get account ID
                const accountId = document.getElementById(`account-${index}`).value;
                
                // Validate account is selected
                if (!accountId) {
                    alert(`Transaction ${index + 1}: Please select an account before saving.`);
                    allValid = false;
                    return;
                }
                
                // Read values from form
                const txn = {
                    accountId: accountId,
                    contractReference: document.getElementById(`contractRef-${index}`).value,
                    date: document.getElementById(`date-${index}`).value,
                    type: document.getElementById(`type-${index}`).value,
                    symbol: document.getElementById(`symbol-${index}`).value.toUpperCase(),
                    company: modal.transactions[index].company || document.getElementById(`symbol-${index}`).value,
                    quantity: parseFloat(document.getElementById(`quantity-${index}`).value),
                    price: parseFloat(document.getElementById(`price-${index}`).value),
                    currency: document.getElementById(`currency-${index}`).value,
                    fees: parseFloat(document.getElementById(`fees-${index}`).value) || 0,
                    total: parseFloat(document.getElementById(`total-${index}`).value),
                    settlementDate: modal.transactions[index].settlementDate || document.getElementById(`date-${index}`).value,
                    accountLast4: modal.transactions[index].accountLast4,
                    sourceFile: modal.fileName
                };
                
                acceptedTransactions.push(txn);
            }
        });
        
        if (acceptedTransactions.length === 0) {
            alert('No transactions accepted. Please accept at least one transaction or click Cancel.');
            return;
        }
        
       console.log('Accepted transactions:', acceptedTransactions);
        console.log('Total accepted:', acceptedTransactions.length);
        
        // Check if validation failed
        if (!allValid) {
            return;
        }
        
        if (acceptedTransactions.length === 0) {
            alert('No transactions accepted. Please accept at least one transaction or click Cancel.');
            return;
        }
        
        modal.remove();
        modal.resolveFunc(acceptedTransactions);
    }
};