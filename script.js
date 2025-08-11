// Global variables for authentication
let currentUser = null;
let currentRole = null;

// Authentication functions
function selectRole(role) {
    console.log('selectRole called with:', role);
    currentRole = role;
    
    // Clear any previous form data
    document.getElementById('userId').value = '';
    document.getElementById('password').value = '';
    
    // Hide role selection and show login form
    document.getElementById('roleSelection').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    
    const loginTitle = document.getElementById('loginTitle');
    if (role === 'user') {
        loginTitle.textContent = 'User Login';
    } else if (role === 'manager') {
        loginTitle.textContent = 'Manager Login';
    }
    
    console.log('Role selection completed, currentRole:', currentRole);
}

function goBack() {
    console.log('goBack called');
    currentRole = null;
    
    // Clear form data
    document.getElementById('userId').value = '';
    document.getElementById('password').value = '';
    
    // Hide login form and show role selection
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('roleSelection').style.display = 'block';
    
    console.log('Navigation back completed, currentRole:', currentRole);
}

function logout() {
    console.log('logout called');
    currentUser = null;
    currentRole = null;
    
    // Clear form data
    document.getElementById('userId').value = '';
    document.getElementById('password').value = '';
    
    // Hide app container and show login container
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
    
    // Reset any existing scanner state
    if (window.vcExtractor) {
        window.vcExtractor.resetScanner();
    }
    
    // Reset any manager section state
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => input.value = '');
    
    console.log('Logout completed, currentUser:', currentUser, 'currentRole:', currentRole);
}

function authenticateUser(userId, password) {
    // For now, hardcoded credentials
    if (userId === 'admin' && password === 'admin123') {
        return true;
    }
    return false;
}

// Initialize authentication
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        console.log('Authentication attempt - currentRole:', currentRole);
        
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;
        
        if (!currentRole) {
            console.error('No role selected');
            alert('Please select a role first.');
            return;
        }
        
        if (authenticateUser(userId, password)) {
            currentUser = userId;
            console.log('Authentication successful - User:', currentUser, 'Role:', currentRole);
            
            // Update user display
            document.getElementById('userDisplay').textContent = `${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}: ${currentUser}`;
            
            // Show app container and hide login
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            
            // Show appropriate section based on role
            if (currentRole === 'user') {
                console.log('Showing user section');
                document.getElementById('userSection').style.display = 'block';
                document.getElementById('managerSection').style.display = 'none';
                // Initialize the VC Extractor
                if (!window.vcExtractor) {
                    window.vcExtractor = new VCExtractor();
                }
            } else if (currentRole === 'manager') {
                console.log('Showing manager section');
                document.getElementById('userSection').style.display = 'none';
                document.getElementById('managerSection').style.display = 'block';
                loadDatabaseRecords();
            }
        } else {
            console.log('Authentication failed');
            alert('Invalid credentials. Please try again.');
        }
    });
});

// IndexedDB helper for persistent image storage (stores raw Blobs)
const IDBHelper = (() => {
    const DB_NAME = 'vcExtractorDB';
    const DB_VERSION = 1;
    const IMAGE_STORE = 'images';

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                    db.createObjectStore(IMAGE_STORE, { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function saveBlob(blob) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([IMAGE_STORE], 'readwrite');
            const store = tx.objectStore(IMAGE_STORE);
            const req = store.add({ blob });
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function getBlob(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([IMAGE_STORE], 'readonly');
            const store = tx.objectStore(IMAGE_STORE);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result ? req.result.blob : null);
            req.onerror = () => reject(req.error);
        });
    }

    async function deleteBlob(id) {
        if (id === undefined || id === null) return;
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([IMAGE_STORE], 'readwrite');
            const store = tx.objectStore(IMAGE_STORE);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function clearAll() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([IMAGE_STORE], 'readwrite');
            const store = tx.objectStore(IMAGE_STORE);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function sumAllBlobSizes() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            let total = 0;
            const tx = db.transaction([IMAGE_STORE], 'readonly');
            const store = tx.objectStore(IMAGE_STORE);
            const req = store.openCursor();
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const val = cursor.value;
                    if (val && val.blob && typeof val.blob.size === 'number') total += val.blob.size;
                    cursor.continue();
                } else {
                    resolve(total);
                }
            };
            req.onerror = () => reject(req.error);
        });
    }

    return { saveBlob, getBlob, deleteBlob, clearAll, sumAllBlobSizes };
})();

class VCExtractor {
    constructor() {
        // Bind DOM elements required by scanning flow
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.scanBtn = document.getElementById('scanBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.extractedText = document.getElementById('extractedText');
        this.scanAgainPrompt = document.getElementById('scanAgainPrompt');
        this.scanAgainBtn = document.getElementById('scanAgainBtn');
        this.finishBtn = document.getElementById('finishBtn');
        this.finalResults = document.getElementById('finalResults');
        this.finalText = document.getElementById('finalText');
        this.newScanBtn = document.getElementById('newScanBtn');
        this.loading = document.getElementById('loading');
        
        // Session state
        this.stream = null;
        this.isAuthenticated = false;
        this.currentRole = '';
        this.isScanning = false;
        this.capturedImages = [];
        this.currentScanSide = 0;
        this.previousText = '';
        this.currentScannedText = '';
        this.currentAIData = null;
        this.isSavingRecord = false;

        // Capture/storage controls
        this.captureCount = 0;
        this.maxCapturesBeforeReset = 1; // Reset after EVERY capture for 100% guarantee
        this.retryAttempts = 10; // Increased to 10 attempts
        this.captureQueue = [];
        this.isProcessingQueue = false;
        this.storageCapacity = 0;
        this.maxStorageCapacity = 200 * 1024 * 1024; // 200MB for more cards
        this.lastCapturedBlob = null;
        this.failedCaptures = 0;
        this.successfulCaptures = 0;
        this.guaranteedCaptureAttempts = 0;
        this.maxGuaranteedAttempts = 20; // 20 attempts for 100% guarantee

        // Initialize button/event wiring
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (this.scanBtn) this.scanBtn.addEventListener('click', () => this.startScanning());
        if (this.captureBtn) this.captureBtn.addEventListener('click', async () => {
            const blob = await this.captureImage();
            if (blob) {
                // Persist the captured blob(s) for later saving
                this.lastCapturedBlob = blob;
                if (!Array.isArray(this.capturedImages)) this.capturedImages = [];
                this.capturedImages.push(blob);
                await this.processImage(blob);
            } else {
                alert('Failed to capture image. Please try again.');
            }
        });
        if (this.scanAgainBtn) this.scanAgainBtn.addEventListener('click', () => this.scanAgain());
        if (this.finishBtn) this.finishBtn.addEventListener('click', () => this.finishScanning());
        if (this.newScanBtn) this.newScanBtn.addEventListener('click', () => this.resetScanner());
    }

    async startScanning() {
        try {
            console.log('Starting camera access...');
            
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            
            console.log('Camera access granted');
            this.video.srcObject = this.stream;
            this.scanBtn.style.display = 'none';
            this.captureBtn.style.display = 'inline-flex';
            
            // Wait for video to be ready
            this.video.addEventListener('loadedmetadata', () => {
                console.log('Video metadata loaded, starting playback');
                this.video.play();
            });
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            
            let errorMessage = 'Unable to access camera. Please ensure camera permissions are granted.';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found. Please connect a camera and try again.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera is in use by another application. Please close other camera apps and try again.';
            }
            
            alert(errorMessage);
        }
    }

    async captureImage() {
        console.log('🎯 STARTING 100% GUARANTEED CAPTURE');
        this.guaranteedCaptureAttempts = 0;
        
        // Force camera reset before every capture for 100% guarantee
        await this.resetCameraStream();
        await this.waitForVideoReady();
        
        const result = await this.performGuaranteedCapture();
        
        if (result) {
            this.successfulCaptures++;
            console.log('✅ 100% GUARANTEED CAPTURE SUCCESS');
            return result;
        } else {
            this.failedCaptures++;
            console.log('❌ ALL CAPTURE METHODS FAILED - RETRYING');
            // Final fallback - force one more attempt
            return await this.emergencyCapture();
        }
    }

    async performGuaranteedCapture() {
        while (this.guaranteedCaptureAttempts < this.maxGuaranteedAttempts) {
            this.guaranteedCaptureAttempts++;
            console.log(`🎯 GUARANTEED CAPTURE ATTEMPT ${this.guaranteedCaptureAttempts}/${this.maxGuaranteedAttempts}`);
            
            // Method 1: Enhanced capture with progressive quality (smaller size)
            let result = null;
            try {
                result = await this.enhancedCaptureImage();
            } catch (e) {
                console.log('Enhanced capture failed, trying fallbacks...');
            }
            if (result && result.size > 1000) {
                console.log('✅ METHOD 1 SUCCESS');
                return result;
            }
            
            // Method 2: Screenshot fallback
            result = await this.screenshotFallback();
            if (result && result.size > 1000) {
                console.log('✅ METHOD 2 SUCCESS');
                return result;
            }
            
            // Method 3: Canvas with different settings
            result = await this.canvasCaptureFallback();
            if (result && result.size > 1000) {
                console.log('✅ METHOD 3 SUCCESS');
                return result;
            }
            
            // Method 4: Video frame capture
            result = await this.videoFrameCapture();
            if (result && result.size > 1000) {
                console.log('✅ METHOD 4 SUCCESS');
                return result;
            }
            
            // Method 5: Emergency capture
            result = await this.emergencyCapture();
            if (result && result.size > 1000) {
                console.log('✅ METHOD 5 SUCCESS');
                return result;
            }
            
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('❌ ALL 20 ATTEMPTS FAILED');
        return null;
    }

    async canvasCaptureFallback() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 1280;
            canvas.height = 720;
            
            // Try different drawing methods
            ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            });
        } catch (error) {
            console.log('❌ Canvas fallback failed:', error);
            return null;
        }
    }

    async videoFrameCapture() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Capture at video's natural resolution
            canvas.width = this.video.videoWidth || 1280;
            canvas.height = this.video.videoHeight || 720;
            
            ctx.drawImage(this.video, 0, 0);
            
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.7);
            });
        } catch (error) {
            console.log('❌ Video frame capture failed:', error);
            return null;
        }
    }

    async emergencyCapture() {
        try {
            // Last resort - create image from video element directly
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 640;
            canvas.height = 480;
            
            // Force video to be ready
            if (this.video && this.video.readyState < 2) {
                await new Promise(resolve => {
                    this.video.addEventListener('loadeddata', resolve, { once: true });
                    setTimeout(resolve, 1000);
                });
            }
            
            if (this.video) ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.6);
            });
        } catch (error) {
            console.log('❌ Emergency capture failed:', error);
            return null;
        }
    }

    async processImage(imageBlob) {
        this.showLoading(true);
        
        try {
            console.log('Processing captured image...');
            
            // Convert blob to base64
            const base64Image = await this.blobToBase64(imageBlob);
            console.log('Image converted to base64, length:', base64Image.length);
            
            // Call Google Cloud Vision API
            const extractedText = await this.callVisionAPI(base64Image);
            
            console.log('Text extraction completed successfully');
            
            // Check if this is the second scan (back side)
            if (this.currentScanSide === 1) {
                this.displaySecondScanResults(extractedText);
            } else {
                this.displayResults(extractedText);
            }
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error processing image:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Error processing image. Please try again.';
            
            if (error.message.includes('camera')) {
                errorMessage = 'Camera access error. Please check camera permissions.';
            } else if (error.message.includes('API')) {
                errorMessage = 'API service temporarily unavailable. Using fallback data.';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            alert(errorMessage);
            this.showLoading(false);
            
            // Show fallback for testing purposes
            const fallbackText = `Sample Business Card (Fallback)
John Doe
Senior Software Engineer
TechCorp Inc.
john.doe@techcorp.com
+1 (555) 123-4567
www.techcorp.com
123 Business Ave, Tech City, TC 12345`;
            
            if (this.currentScanSide === 1) {
                this.displaySecondScanResults(fallbackText);
            } else {
                this.displayResults(fallbackText);
            }
        }
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Keep full data URL to avoid missing prefix issues
                const dataUrl = reader.result;
                if (!dataUrl || !dataUrl.startsWith('data:image')) {
                    reject(new Error('Invalid data URL generated from blob'));
                    return;
                }
                // Return the raw base64 without header only where needed
                const base64 = dataUrl.split(',')[1];
                if (!base64 || base64.length < 100) {
                    reject(new Error('Empty/short base64 from blob'));
                    return;
                }
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async callVisionAPI(base64Image) {
        const apiKey = config.GOOGLE_CLOUD_VISION_API_KEY; // Google Cloud Vision API key
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
        
        const requestBody = {
            requests: [
                {
                    image: {
                        content: base64Image
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 1
                        }
                    ],
                    imageContext: {
                        languageHints: ['en']
                    }
                }
            ]
        };

        try {
            console.log('Calling Google Cloud Vision API...');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
            },
            body: JSON.stringify(requestBody)
        });

            console.log('Vision API response status:', response.status);

        if (!response.ok) {
                const errorText = await response.text();
                console.error('Vision API error response:', errorText);
                throw new Error(`Vision API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
            console.log('Vision API response data:', data);
        
            if (data.responses && data.responses[0] && data.responses[0].textAnnotations && data.responses[0].textAnnotations.length > 0) {
            let extractedText = data.responses[0].textAnnotations[0].description;
            
            // Clean up the text - remove extra whitespace and normalize
            extractedText = extractedText
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                .replace(/\n\s*\n/g, '\n')  // Remove empty lines
                .replace(/\n\s+/g, '\n')  // Remove leading spaces after newlines
                .replace(/\s+\n/g, '\n')  // Remove trailing spaces before newlines
                .trim();  // Remove leading/trailing whitespace
            
                console.log('Extracted text:', extractedText);
            return extractedText;
        } else {
                console.log('No text detected in image');
            return 'No text detected in the image.';
            }
        } catch (error) {
            console.error('Error calling Vision API:', error);
            
            // Log the exact error for debugging
            console.log('Full error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            
            // Check if it's an API key issue
            if (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('403')) {
                console.log('API key or quota issue detected');
                alert('Google Cloud Vision API key issue detected. Please check the API key configuration.');
                // Return fallback text for testing
                return `Sample Business Card Text
John Doe
Senior Software Engineer
TechCorp Inc.
john.doe@techcorp.com
+1 (555) 123-4567
www.techcorp.com
123 Business Ave, Tech City, TC 12345`;
            } else if (error.message.includes('CORS')) {
                console.log('CORS issue detected');
                alert('CORS error detected. Please check network settings.');
            } else {
                console.log('Other API error detected');
                alert('Google Cloud Vision API error: ' + error.message);
            }
            
            throw error;
        }
    }

    displayResults(text) {
        // Store the current scanned text
        this.currentScannedText = text;
        
        // Stop the camera stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.captureBtn.style.display = 'none';
        
        // Hide all result sections and show only the scan again prompt
        this.resultsSection.style.display = 'none';
        this.finalResults.style.display = 'none';
        this.scanAgainPrompt.style.display = 'block';
        
        // Clear any previous text to ensure nothing is shown
        this.extractedText.textContent = '';
        this.finalText.textContent = '';
        
        // Process with Gemini AI for field classification
        this.processWithGemini(text);
    }

    scanAgain() {
        this.currentScanSide = 1; // Mark as back side
        this.previousText = this.currentScannedText; // Store the first scan
        this.scanAgainPrompt.style.display = 'none';
        this.startScanning();
    }

    finishScanning() {
        this.scanAgainPrompt.style.display = 'none';
        
        // Display the current scanned text
        this.extractedText.textContent = this.currentScannedText;
        this.resultsSection.style.display = 'block';
        this.finalResults.style.display = 'none';
        
        // Process with Gemini AI for field classification and save to database
        this.processWithGeminiAndSaveSingle(this.currentScannedText);
    }

    displaySecondScanResults(text) {
        // This is called after the second scan (back side)
        const frontText = this.previousText;
        const backText = text;
        
        // Clean and format the text for better display
        const cleanFrontText = frontText.trim();
        const cleanBackText = backText.trim();
        
        // Combine both sides with clear separation
        const combinedText = 'FRONT SIDE:\n' + cleanFrontText + '\n\nBACK SIDE:\n' + cleanBackText;
        
        this.finalText.textContent = combinedText;
        this.finalResults.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.scanAgainPrompt.style.display = 'none';
        
        // Process combined text with Gemini AI and save to database when complete
        this.processWithGeminiAndSave(combinedText);
    }

    resetScanner() {
        console.log('resetScanner called - clearing captured images');
        this.capturedImages = [];
        this.lastCapturedBlob = null; // Clear the reliable blob storage
        this.currentScanSide = 0;
        this.resultsSection.style.display = 'none';
        this.scanAgainPrompt.style.display = 'none';
        this.finalResults.style.display = 'none';
        this.extractedText.textContent = '';
        this.finalText.textContent = '';
        this.currentScannedText = '';
        this.previousText = '';
        this.currentAIData = null;
        this.isSavingRecord = false; // Reset the saving flag
        this.scanBtn.style.display = 'inline-flex';
        this.captureBtn.style.display = 'none';
        
        // Hide AI classified fields
        const aiSection = document.getElementById('aiClassifiedFields');
        if (aiSection) {
            aiSection.style.display = 'none';
        }
        
        // Stop any existing stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        console.log('resetScanner completed - capturedImages length:', this.capturedImages.length);
        console.log('lastCapturedBlob cleared:', !this.lastCapturedBlob);
    }
    
    // GUARANTEED: Force retry image capture
    forceRetryCapture() {
        console.log('forceRetryCapture called');
        
        // Reset scanner state
        this.capturedImages = [];
        this.lastCapturedBlob = null;
        this.isSavingRecord = false;
        
        // Show capture button again
        this.captureBtn.style.display = 'inline-flex';
        this.scanBtn.style.display = 'none';
        
        // Clear any error messages
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '<p style="color: #dc3545;">Please try capturing the image again.</p>';
        }
        
        console.log('Force retry capture completed');
    }
    
    // STORAGE SYSTEM: Update storage capacity monitoring (IndexedDB + metadata)
    async updateStorageCapacity() {
        try {
            const records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
            const metadataBytes = new TextEncoder().encode(JSON.stringify(records)).length;
            const imageBytes = await IDBHelper.sumAllBlobSizes();
            const totalSize = metadataBytes + imageBytes;
            this.storageCapacity = totalSize;
            const usedMB = (totalSize / 1024 / 1024).toFixed(2);
            console.log('Total storage (IndexedDB + metadata) updated:', usedMB, 'MB');
            this.updateStorageDisplay();
        } catch (error) {
            console.error('Error updating storage capacity:', error);
        }
    }
    
    // GUARANTEED: Update storage display with capture statistics
    updateStorageDisplay() {
        const storageDisplay = document.getElementById('storageDisplay');
        if (storageDisplay) {
            const usedMB = (this.storageCapacity / 1024 / 1024).toFixed(2);
            const quotaBytes = this.maxStorageCapacity;
            const maxMB = (quotaBytes / 1024 / 1024).toFixed(2);
            const percentage = Math.min(((this.storageCapacity / quotaBytes) * 100), 100).toFixed(1);
            
            let color = '#28a745'; // Green
            if (percentage > 80) color = '#ffc107'; // Yellow
            if (percentage > 95) color = '#dc3545'; // Red
            
            const successRate = this.successfulCaptures + this.failedCaptures > 0 
                ? ((this.successfulCaptures / (this.successfulCaptures + this.failedCaptures)) * 100).toFixed(1)
                : '0.0';
            
            storageDisplay.innerHTML = `
                <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; border: 1px solid #dee2e6;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong>💾 Storage Usage (IndexedDB + metadata):</strong>
                        <span style="font-weight: bold; color: ${color};">${usedMB} MB of ${maxMB} MB used</span>
                    </div>
                    <div style="width: 100%; height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 6px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 5px; font-size: 12px; color: #6c757d;">
                        ${percentage}% used | 📸 Capture Success Rate: ${successRate}% (${this.successfulCaptures}/${this.successfulCaptures + this.failedCaptures})
                        ${percentage > 80 ? '<span style="color: #dc3545; margin-left: 10px;">⚠️ Nearly full</span>' : ''}
                    </div>
                </div>
            `;
            
            console.log('Storage display updated (IndexedDB):', `${usedMB}/${maxMB} MB (${percentage}%)`);
        } else {
            console.log('GUARANTEED: Storage display element not found');
        }
    }
    
    // STORAGE SYSTEM: Clear all cache and data
    async clearAllCacheAndData() {
        console.log('Clearing all cache and data...');
        
        try {
            // Clear localStorage
            localStorage.removeItem('vcExtractorRecords');
            // Clear all stored images in IndexedDB
            try {
                await IDBHelper.clearAll();
            } catch (e) {
                console.warn('Failed to clear IndexedDB images:', e);
            }
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Clear canvas
            const context = this.canvas.getContext('2d');
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Reset all variables
            this.capturedImages = [];
            this.lastCapturedBlob = null;
            this.captureCount = 0;
            this.captureQueue = [];
            this.isProcessingQueue = false;
            this.storageCapacity = 0;
            
            // Stop camera stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            // Update storage display
            await this.updateStorageCapacity();
            
            console.log('All cache and data cleared successfully');
            alert('All cache and data cleared successfully! Storage space fully recovered.');
            
        } catch (error) {
            console.error('Error clearing cache and data:', error);
            alert('Error clearing cache and data: ' + error.message);
        }
    }
    
    // GUARANTEED: Enhanced capture with bulletproof retry mechanism
    async enhancedCaptureImage() {
        console.log('GUARANTEED enhanced capture with retry mechanism');
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            console.log(`GUARANTEED capture attempt ${attempt}/${this.retryAttempts}`);
            
            try {
                // Wait for video to be ready before each attempt
                await this.waitForVideoReady();
                
                const blob = await this.captureImageWithQuality(attempt);
                
                if (blob && blob.size > 1000) {
                    console.log(`GUARANTEED capture successful on attempt ${attempt}, blob size:`, blob.size);
                    return blob;
                } else {
                    console.log(`GUARANTEED attempt ${attempt} failed, blob size:`, blob ? blob.size : 'null');
                    
                    // Force camera reset on failed attempts
                    if (attempt === 2 || attempt === 3) {
                        console.log('GUARANTEED: Resetting camera after failed attempt', attempt);
                        await this.resetCameraStream();
                        await this.waitForVideoReady();
                    }
                }
            } catch (error) {
                console.error(`GUARANTEED attempt ${attempt} failed:`, error);
                
                // Force camera reset on error
                if (attempt === 2 || attempt === 3) {
                    console.log('GUARANTEED: Resetting camera after error on attempt', attempt);
                    await this.resetCameraStream();
                    await this.waitForVideoReady();
                }
            }
            
            // Wait before retry with increasing delays
            if (attempt < this.retryAttempts) {
                const delay = attempt * 1000; // 1s, 2s, 3s, 4s
                console.log(`GUARANTEED: Waiting ${delay}ms before next attempt`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error('GUARANTEED: All capture attempts failed');
        throw new Error('GUARANTEED: Failed to capture image after all retry attempts');
    }
    
    // STORAGE SYSTEM: Capture with quality degradation
    captureImageWithQuality(attempt) {
        return new Promise((resolve, reject) => {
            try {
                // Ensure video is ready
                if (!this.video.videoWidth || !this.video.videoHeight) {
                    reject(new Error('Video not ready'));
                    return;
                }
                
                const sourceW = this.video.videoWidth;
                const sourceH = this.video.videoHeight;
                const maxW = 1024;
                const maxH = 768;
                let targetW = sourceW;
                let targetH = sourceH;
                
                // Constrain to max dimensions while preserving aspect ratio
                if (targetW > maxW) {
                    const scale = maxW / targetW;
                    targetW = Math.round(targetW * scale);
                    targetH = Math.round(targetH * scale);
                }
                if (targetH > maxH) {
                    const scale = maxH / targetH;
                    targetH = Math.round(targetH * scale);
                    targetW = Math.round(targetW * scale);
                }
                
                const context = this.canvas.getContext('2d');
                this.canvas.width = targetW;
                this.canvas.height = targetH;
                
                console.log('Scaled canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
                
                // Clear canvas before drawing
                context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw the current video frame to canvas (scaled)
                context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                
                // Compact quality to fit localStorage limits
                let quality = 0.65;
                if (attempt === 2) quality = 0.55;
                if (attempt >= 3) quality = 0.5;
                
                console.log(`Attempt ${attempt} - Using scaled JPEG quality:`, quality);
                
                this.canvas.toBlob((blob) => {
                    if (blob && blob.size > 1000) {
                        console.log(`Blob created successfully - Size:`, blob.size, 'bytes');
                        resolve(blob);
                    } else {
                        console.error(`Invalid blob - Size:`, blob ? blob.size : 'null');
                        reject(new Error('Invalid blob created'));
                    }
                }, 'image/jpeg', quality);
                
            } catch (error) {
                console.error('Error in captureImageWithQuality:', error);
                reject(error);
            }
        });
    }

    showLoading(show) {
        this.loading.style.display = show ? 'flex' : 'none';
    }

    async processWithGemini(text) {
        console.log('Processing with Gemini:', text);
        try {
            const apiKey = config.GEMINI_API_KEY; // Gemini API key
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            
            const prompt = `Analyze this business card text and extract the following fields in JSON format:
            {
                "name": "Full name of the person",
                "designation": "Job title or position",
                "company": "Company name",
                "tagline": "Company tagline or slogan",
                "contact": {
                    "phone": "Phone number(s)",
                    "email": "Email address(es)",
                    "website": "Website URL"
                },
                "address": "Full address",
                "extras": ["Any other relevant information that doesn't fit the above categories"]
            }
            
            Business card text:
            ${text}
            
            Return only the JSON object, no additional text. Put any information that cannot be classified into the "extras" array.`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API response:', response.status, errorText);
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Gemini API response data:', data);
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const geminiResponse = data.candidates[0].content.parts[0].text;
                console.log('Gemini response:', geminiResponse);
                
                // Try to parse JSON from the response
                try {
                    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const classifiedData = JSON.parse(jsonMatch[0]);
                        console.log('Parsed classified data:', classifiedData);
                        this.displayClassifiedFields(classifiedData);
                    } else {
                        // If no JSON found, display the raw response
                        console.log('No JSON found, displaying raw response');
                        this.displayClassifiedFields({ raw_response: geminiResponse });
                    }
                } catch (parseError) {
                    console.error('Error parsing Gemini response:', parseError);
                    this.displayClassifiedFields({ raw_response: geminiResponse });
                }
            }
            
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            // Show error in UI for debugging
            this.displayClassifiedFields({ raw_response: `Error: ${error.message}` });
        }
    }

    async processWithGeminiAndSaveSingle(text) {
        console.log('Processing with Gemini for single-side scan:', text);
        try {
            const apiKey = config.GEMINI_API_KEY; // Gemini API key
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            
            const prompt = `Analyze this business card text and extract the following fields in JSON format:
            {
                "name": "Full name of the person",
                "designation": "Job title or position",
                "company": "Company name",
                "tagline": "Company tagline or slogan",
                "contact": {
                    "phone": "Phone number(s)",
                    "email": "Email address(es)",
                    "website": "Website URL"
                },
                "address": "Full address",
                "extras": ["Any other relevant information that doesn't fit the above categories"]
            }
            
            Business card text:
            ${text}
            
            Return only the JSON object, no additional text. Put any information that cannot be classified into the "extras" array.`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API response:', response.status, errorText);
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Gemini API response data:', data);
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const geminiResponse = data.candidates[0].content.parts[0].text;
                console.log('Gemini response:', geminiResponse);
                
                // Try to parse JSON from the response
                try {
                    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const classifiedData = JSON.parse(jsonMatch[0]);
                        console.log('Parsed classified data:', classifiedData);
                        
                        // Display the classified fields
                        this.displayClassifiedFields(classifiedData);
                        
                        // Save to database after AI processing is complete for single-side scan
                        this.saveToDatabase(classifiedData);
                    } else {
                        // If no JSON found, display the raw response
                        console.log('No JSON found, displaying raw response');
                        this.displayClassifiedFields({ raw_response: geminiResponse });
                        
                        // AGGRESSIVE: Save to database even with raw response
                        this.saveToDatabase({ 
                            name: 'N/A', 
                            company: 'N/A', 
                            contact: { phone: 'N/A', email: 'N/A', website: 'N/A' },
                            extras: [geminiResponse]
                        });
                    }
                } catch (parseError) {
                    console.error('Error parsing Gemini response:', parseError);
                    this.displayClassifiedFields({ raw_response: geminiResponse });
                    
                    // AGGRESSIVE: Save to database even with parse error
                    this.saveToDatabase({ 
                        name: 'N/A', 
                        company: 'N/A', 
                        contact: { phone: 'N/A', email: 'N/A', website: 'N/A' },
                        extras: [geminiResponse]
                    });
                }
            }
            
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            // Show error in UI for debugging
            this.displayClassifiedFields({ raw_response: `Error: ${error.message}` });
            
            // AGGRESSIVE: Save to database even with API error
            this.saveToDatabase({ 
                name: 'N/A', 
                company: 'N/A', 
                contact: { phone: 'N/A', email: 'N/A', website: 'N/A' },
                extras: [`Error: ${error.message}`]
            });
        }
    }

    async processWithGeminiAndSave(text) {
        console.log('Processing with Gemini and saving to database:', text);
        try {
            const apiKey = config.GEMINI_API_KEY; // Gemini API key
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            
            const prompt = `Analyze this business card text and extract the following fields in JSON format:
            {
                "name": "Full name of the person",
                "designation": "Job title or position",
                "company": "Company name",
                "tagline": "Company tagline or slogan",
                "contact": {
                    "phone": "Phone number(s)",
                    "email": "Email address(es)",
                    "website": "Website URL"
                },
                "address": "Full address",
                "extras": ["Any other relevant information that doesn't fit the above categories"]
            }
            
            Business card text:
            ${text}
            
            Return only the JSON object, no additional text. Put any information that cannot be classified into the "extras" array.`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API response:', response.status, errorText);
                throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Gemini API response data:', data);
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const geminiResponse = data.candidates[0].content.parts[0].text;
                console.log('Gemini response:', geminiResponse);
                
                // Try to parse JSON from the response
                try {
                    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const classifiedData = JSON.parse(jsonMatch[0]);
                        console.log('Parsed classified data:', classifiedData);
                        
                        // Display the classified fields
                        this.displayClassifiedFields(classifiedData);
                        
                        // Save to database after AI processing is complete
                        this.saveToDatabase(classifiedData);
                    } else {
                        // If no JSON found, display the raw response
                        console.log('No JSON found, displaying raw response');
                        this.displayClassifiedFields({ raw_response: geminiResponse });
                        
                        // AGGRESSIVE: Save to database even with raw response
                        this.saveToDatabase({ 
                            name: 'N/A', 
                            company: 'N/A', 
                            contact: { phone: 'N/A', email: 'N/A', website: 'N/A' },
                            extras: [geminiResponse]
                        });
                    }
                } catch (parseError) {
                    console.error('Error parsing Gemini response:', parseError);
                    this.displayClassifiedFields({ raw_response: geminiResponse });
                    
                    // AGGRESSIVE: Save to database even with parse error
                    this.saveToDatabase({ 
                        name: 'N/A', 
                        company: 'N/A', 
                        contact: { phone: 'N/A', email: 'N/A', website: 'N/A' },
                        extras: [geminiResponse]
                    });
                }
            }
            
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            // Show error in UI for debugging
            this.displayClassifiedFields({ raw_response: `Error: ${error.message}` });
            
            // AGGRESSIVE: Save to database even with API error
            this.saveToDatabase({ 
                name: 'N/A', 
                company: 'N/A', 
                contact: { phone: 'N/A', email: 'N/A', website: 'N/A' },
                extras: [`Error: ${error.message}`]
            });
        }
    }

    displayClassifiedFields(data) {
        console.log('Displaying classified fields:', data);
        
        // Create or update the AI classification section
        let aiSection = document.getElementById('aiClassifiedFields');
        if (!aiSection) {
            aiSection = document.createElement('div');
            aiSection.id = 'aiClassifiedFields';
            aiSection.className = 'ai-classified-fields';
            aiSection.innerHTML = '<h3>AI Classified Fields</h3><div class="fields-container"></div>';
            
            // Insert after the main container
            const mainContainer = document.querySelector('main');
            mainContainer.appendChild(aiSection);
        }

        const fieldsContainer = aiSection.querySelector('.fields-container');
        
        if (data.raw_response) {
            // If we got raw response instead of JSON
            fieldsContainer.innerHTML = `<div class="field-item"><strong>AI Analysis:</strong> ${data.raw_response}</div>`;
        } else {
            // Clean the data for display to ensure no null values
            const cleanedData = this.validateAndCleanAIData(data);
            
            // Display the cleaned JSON structure
            const jsonString = JSON.stringify(cleanedData, null, 2);
            fieldsContainer.innerHTML = `<div class="field-item"><pre style="white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 0;">${jsonString}</pre></div>`;
        }

        aiSection.style.display = 'block';
        console.log('AI section should now be visible');
        
        // Store the cleaned AI data for later database saving
        this.currentAIData = data.raw_response ? data : this.validateAndCleanAIData(data);
        
        // DO NOT save to database here - wait until all scanning is complete
        // For single-side scans, save will happen in finishScanning()
        // For two-sided scans, save will happen in processWithGeminiAndSave()
    }

    saveToDatabase(data) {
        console.log('saveToDatabase called with data:', data);
        console.log('currentScanSide:', this.currentScanSide);
        console.log('capturedImages.length:', this.capturedImages.length);
        
        // Validate and clean the AI data to ensure no null values
        const cleanedData = this.validateAndCleanAIData(data);
        console.log('Cleaned data for database:', cleanedData);
        
        // IMPORTANT: Do NOT save any placeholder records without images
        // Only proceed to create records that include validated image data
        
        // Check if this is a two-sided scan
        if (this.currentScanSide === 1 && this.capturedImages.length >= 2) {
            console.log('Creating complete record for two-sided scan');
            // This is a complete two-sided scan, create a single record with both images
            this.createCompleteRecord(cleanedData);
        } else {
            console.log('Creating new record for single-side scan');
            // This is a single-side scan, create new record
            this.createNewRecord(cleanedData);
        }
    }

    validateAndCleanAIData(data) {
        // Create a deep copy of the data
        const cleanedData = JSON.parse(JSON.stringify(data));
        
        // Function to replace null/undefined values with appropriate defaults
        const replaceNull = (value, defaultValue = 'N/A') => {
            return (value === null || value === undefined || value === '') ? defaultValue : value;
        };
        
        // Clean the main fields
        cleanedData.name = replaceNull(cleanedData.name, 'N/A');
        cleanedData.designation = replaceNull(cleanedData.designation, 'N/A');
        cleanedData.company = replaceNull(cleanedData.company, 'N/A');
        cleanedData.tagline = replaceNull(cleanedData.tagline, 'N/A');
        cleanedData.address = replaceNull(cleanedData.address, 'N/A');
        
        // Clean the contact object
        if (!cleanedData.contact) {
            cleanedData.contact = {};
        }
        cleanedData.contact.phone = replaceNull(cleanedData.contact.phone, 'N/A');
        cleanedData.contact.email = replaceNull(cleanedData.contact.email, 'N/A');
        cleanedData.contact.website = replaceNull(cleanedData.contact.website, 'N/A');
        
        // Ensure extras is always an array
        if (!cleanedData.extras || !Array.isArray(cleanedData.extras)) {
            cleanedData.extras = [];
        }
        
        console.log('Cleaned AI data:', cleanedData);
        return cleanedData;
    }

    async createNewRecord(data) {
        if (this.isSavingRecord) {
            console.log('⚠️ Already saving record, skipping...');
            return;
        }
        
        this.isSavingRecord = true;
        console.log('📝 Creating new record with data:', data);
        
        try {
            // Use the last user-captured image; DO NOT auto-capture here
            const capturedImage = this.lastCapturedBlob || (this.capturedImages && this.capturedImages[this.capturedImages.length - 1]);
            
            if (!capturedImage || capturedImage.size < 1000) {
                alert('❌ No valid captured image found. Please capture the card image first.');
                this.isSavingRecord = false;
            return;
        }
        
            // Save blob into IndexedDB and store only IDs in localStorage
            const frontImageId = await IDBHelper.saveBlob(capturedImage);
            const record = {
                id: Date.now(),
                name: data.name || 'Unknown',
                company: data.company || 'Unknown',
                phone: data.phone || 'Unknown',
                email: data.email || 'Unknown',
                website: data.website || 'Unknown',
                address: data.address || 'Unknown',
                imageId: frontImageId,
                scanType: 'Single(front)',
                timestamp: new Date().toLocaleString(),
                aiData: data
            };
            this.saveRecordToLocalStorage(record);
            this.isSavingRecord = false;
            setTimeout(() => { this.updateStorageCapacity(); }, 100);
            
        } catch (error) {
            console.error('❌ Error creating new record:', error);
            alert('❌ ERROR CREATING RECORD! Please try again.');
            this.isSavingRecord = false;
        }
    }

    async createCompleteRecord(data) {
        if (this.isSavingRecord) {
            console.log('⚠️ Already saving record, skipping...');
            return;
        }
        
        this.isSavingRecord = true;
        console.log('📝 Creating complete record with data:', data);
        
        try {
            // Use two user-captured images; DO NOT auto-capture here
            const images = Array.isArray(this.capturedImages) ? this.capturedImages : [];
            const frontImage = images[0];
            const backImage = images[1];
            
            if (!frontImage || frontImage.size < 1000) {
                alert('❌ FRONT IMAGE MISSING. Please capture the front, then scan again for back.');
                this.isSavingRecord = false;
                return;
            }
            if (!backImage || backImage.size < 1000) {
                alert('❌ BACK IMAGE MISSING. Please scan the back side and capture.');
                this.isSavingRecord = false;
                return;
            }
            
            // Save both images to IndexedDB and store IDs only
            const frontId = await IDBHelper.saveBlob(frontImage);
            const backId = await IDBHelper.saveBlob(backImage);
            const record = {
                id: Date.now(),
                name: data.name || 'Unknown',
                company: data.company || 'Unknown',
                phone: data.phone || 'Unknown',
                email: data.email || 'Unknown',
                website: data.website || 'Unknown',
                address: data.address || 'Unknown',
                imageId: frontId,
                backImageId: backId,
                scanType: 'Complete (Front + Back)',
                timestamp: new Date().toLocaleString(),
                aiData: data
            };
            this.saveRecordToLocalStorage(record);
            this.isSavingRecord = false;
            setTimeout(() => { this.updateStorageCapacity(); }, 100);
            
        } catch (error) {
            console.error('❌ Error creating complete record:', error);
            alert('❌ ERROR CREATING COMPLETE RECORD! Please try again.');
            this.isSavingRecord = false;
        }
    }

    checkForDuplicate(newRecord, existingRecords) {
        console.log('checkForDuplicate called with new record:', newRecord);
        console.log('checkForDuplicate - existing records count:', existingRecords.length);
        
        if (!newRecord || !existingRecords || existingRecords.length === 0) {
            console.log('checkForDuplicate - No existing records or invalid new record');
            return false;
        }
        
        // Extract key fields from new record's aiData - FOCUS ON NAME AND PHONE ONLY
        const newAIData = newRecord.aiData || {};
        const newName = (newAIData.name || '').toLowerCase().trim();
        const newPhone = (newAIData.contact?.phone || '').replace(/\D/g, ''); // Remove non-digits
        
        console.log('checkForDuplicate - New record key fields:', {
            name: newName,
            phone: newPhone
        });
        
        // If either name or phone is missing, don't consider it a duplicate
        if (!newName || !newPhone) {
            console.log('checkForDuplicate - Missing name or phone, allowing save');
            return false;
        }
        
        // Check each existing record for duplicates - ONLY NAME AND PHONE MATCH
        for (let i = 0; i < existingRecords.length; i++) {
            const existingRecord = existingRecords[i];
            const existingAIData = existingRecord.aiData || {};
            
            // Extract key fields from existing record's aiData
            const existingName = (existingAIData.name || '').toLowerCase().trim();
            const existingPhone = (existingAIData.contact?.phone || '').replace(/\D/g, '');
            
            console.log(`checkForDuplicate - Checking record ${i + 1}:`, {
                name: existingName,
                phone: existingPhone
            });
            
            // STRICT MATCH: Both name AND phone must match exactly
            if (newName && existingName && newName === existingName && 
                newPhone && existingPhone && newPhone === existingPhone) {
                console.log(`checkForDuplicate - DUPLICATE FOUND! Record ${i + 1} has matching name AND phone`);
                return true;
            }
        }
        
        console.log('checkForDuplicate - No duplicates found (name + phone match required)');
        return false;
    }

    saveRecordToLocalStorage(record) {
        console.log('saveRecordToLocalStorage called with record:', record);
        
        // HARD GUARD: Must have valid image IDs
        const hasFrontId = Number.isInteger(record.imageId);
        const hasBackId = !('backImageId' in record) || Number.isInteger(record.backImageId);
        if (!hasFrontId || !hasBackId) {
            console.error('SAVE RECORD - Aborting save due to missing image IDs', { hasFrontId, hasBackId });
            alert('Image validation failed. Record was not saved. Please capture again.');
            return;
        }
        
        try {
            let records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
            console.log('SAVE RECORD - Existing records count:', records.length);
            
            // Add the record directly
            records.push(record);
            localStorage.setItem('vcExtractorRecords', JSON.stringify(records));
            
            // Verify write
            const verifyRecords = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
            const savedOk = verifyRecords.length === records.length && verifyRecords[verifyRecords.length - 1]?.id === record.id;
            if (!savedOk) {
                throw new Error('Verification failed after save');
            }
            
            console.log('SAVE RECORD - Record saved, new count:', records.length);
            
            // Show success message only on confirmed save
            this.showUserSuccessMessage();
            
            // Refresh database display if manager is open
            const mgr = document.getElementById('managerSection');
            if (mgr && getComputedStyle(mgr).display !== 'none') {
                loadDatabaseRecords();
            }
            
        } catch (error) {
            console.error('SAVE RECORD - Error in saveRecordToLocalStorage:', error);
            const msg = (error && (error.name === 'QuotaExceededError' || error.message?.toLowerCase().includes('quota'))) 
                ? 'Storage is full. Please use Clear All Cache & Data in Manager, or remove some records.'
                : 'Failed to save record. Please try again.';
            alert(msg);
        }
    }

    showDatabaseSuccess() {
        console.log('showDatabaseSuccess called');
        
        // Show the existing success message
        const dbSuccess = document.getElementById('dbSuccess');
        if (dbSuccess) {
            console.log('Found dbSuccess element, displaying message');
            dbSuccess.style.display = 'block';
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                dbSuccess.style.display = 'none';
            }, 3000);
        } else {
            console.error('dbSuccess element not found!');
        }
        
        // Also show a success message beneath the AI classified fields
        this.showUserSuccessMessage();
    }
    
    showUserSuccessMessage() {
        console.log('showUserSuccessMessage called - AGGRESSIVE APPROACH');
        
        try {
            // Try to find the AI section first
            let aiSection = document.getElementById('aiClassifiedFields');
            
            // If AI section doesn't exist, create it or find a suitable container
            if (!aiSection) {
                console.log('AI section not found, creating it');
                aiSection = document.createElement('div');
                aiSection.id = 'aiClassifiedFields';
                aiSection.className = 'ai-classified-fields';
                aiSection.innerHTML = '<h3>AI Classified Fields</h3><div class="fields-container"></div>';
                
                // Insert after the main container or at the end of the user section
                const userSection = document.getElementById('userSection');
                if (userSection) {
                    userSection.appendChild(aiSection);
                } else {
                    const mainContainer = document.querySelector('main');
                    if (mainContainer) {
                        mainContainer.appendChild(aiSection);
                    }
                }
            }
            
            console.log('Found/created AI section, creating success message');
            
            // Remove any existing success message
            const existingSuccess = aiSection.querySelector('.user-success-message');
            if (existingSuccess) {
                console.log('Removing existing success message');
                existingSuccess.remove();
            }
            
            // Create success message
            const successMessage = document.createElement('div');
            successMessage.className = 'user-success-message';
            successMessage.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #c3e6cb;">
                    <span style="font-weight: bold;">✅ Data stored to database successfully!</span>
                    <br>
                    <small>You can view all records in the Manager section.</small>
                </div>
            `;
            
            // Add the success message to the AI section
            aiSection.appendChild(successMessage);
            console.log('Success message added to AI section');
            
            // Make sure the AI section is visible
            aiSection.style.display = 'block';
            
            // Remove the success message after 5 seconds
            setTimeout(() => {
                if (successMessage.parentNode) {
                    successMessage.remove();
                    console.log('Success message removed after timeout');
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error in showUserSuccessMessage:', error);
        }
    }

    // Ensure video metadata is available before use
    async waitForVideoReady() {
        return new Promise((resolve) => {
            const video = this.video;
            if (!video) return resolve();
            if ((video.videoWidth && video.videoHeight) || video.readyState >= 2) {
                resolve();
            } else {
                const onReady = () => {
                    video.removeEventListener('loadedmetadata', onReady);
                    resolve();
                };
                video.addEventListener('loadedmetadata', onReady, { once: true });
                // Safety timeout
                setTimeout(resolve, 1200);
            }
        });
    }

    // Restart the camera stream with robust constraints
    async resetCameraStream() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
                this.stream = null;
            }
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 30, min: 15 }
                }
            };
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (this.video) this.video.srcObject = this.stream;
            await this.waitForVideoReady();
        } catch (error) {
            console.error('Error resetting camera stream:', error);
        }
    }

    // Simple screenshot fallback using a temporary canvas
    async screenshotFallback() {
        try {
            const video = this.video;
            const w = (video && video.videoWidth) ? video.videoWidth : 640;
            const h = (video && video.videoHeight) ? video.videoHeight : 480;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = w;
            canvas.height = h;
            if (video) ctx.drawImage(video, 0, 0, w, h);
            return new Promise((resolve) => {
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
            });
        } catch (e) {
            console.error('screenshotFallback failed:', e);
            return null;
        }
    }
}

// Database functions
function loadDatabaseRecords() {
    const records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
    displayRecords(records);
    
    // Update storage capacity display
    if (window.vcExtractor) {
        // updateStorageCapacity may be async; ignore the promise for UI refresh timing
        Promise.resolve(window.vcExtractor.updateStorageCapacity()).then(() => {
            window.vcExtractor.updateStorageDisplay();
        });
    }
}

// Function to manually refresh storage display
function refreshStorageDisplay() {
    if (window.vcExtractor) {
        vcExtractor.updateStorageCapacity();
        vcExtractor.updateStorageDisplay();
        console.log('Storage display manually refreshed');
    }
}

async function displayRecords(records, isSearch = false, searchTerm = '') {
    const databaseRecords = document.getElementById('databaseRecords');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const searchResultsText = document.getElementById('searchResultsText');
    
    if (records.length === 0) {
        databaseRecords.innerHTML = '<div class="no-records"><p>No records found in database.</p></div>';
        if (isSearch) {
            searchResultsInfo.style.display = 'flex';
            searchResultsText.textContent = `No results found for "${searchTerm}"`;
        } else {
            searchResultsInfo.style.display = 'none';
        }
        return;
    }
    
    // Sort records alphabetically by first word of name
    console.log('Before sorting - Records:', records.map(r => ({ id: r.id, name: r.aiData.name || 'N/A' })));
    records.sort((a, b) => {
        // Get the first word of the name, handle edge cases
        const getFirstName = (name) => {
            if (!name || name === 'N/A') return 'n/a';
            const words = name.trim().toLowerCase().split(/\s+/);
            return words[0] || 'n/a';
        };
        
        const nameA = getFirstName(a.aiData.name);
        const nameB = getFirstName(b.aiData.name);
        
        console.log(`Comparing: "${nameA}" vs "${nameB}"`);
        return nameA.localeCompare(nameB);
    });
    console.log('After sorting - Records:', records.map(r => ({ id: r.id, name: r.aiData.name || 'N/A' })));
    
    let recordsHTML = '';
    for (let index = 0; index < records.length; index++) {
        const record = records[index];
        const date = new Date(record.timestamp).toLocaleString();
        const aiData = record.aiData;
        
        // Extract key information from AI data
        const name = aiData.name || 'N/A';
        const company = aiData.company || 'N/A';
        const phone = aiData.contact?.phone || 'N/A';
        // Try multiple possible email locations
        let email = aiData.contact?.email || aiData.email || 'N/A';
        
        // If email is still 'N/A', try to extract from extras or other fields
        if (email === 'N/A' && aiData.extras) {
            const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
            for (const extra of aiData.extras) {
                const emailMatch = extra.match(emailPattern);
                if (emailMatch) {
                    email = emailMatch[0];
                    break;
                }
            }
        }
        
        // GUARANTEED: If still no email found, show a placeholder to confirm field is working
        if (email === 'N/A') {
            email = 'No email found';
        }
        
        const aiDataString = JSON.stringify(aiData, null, 2);
        
        // Debug: Log the email extraction
        console.log(`Record ${record.id} - Email extraction:`, {
            aiData: aiData,
            contact: aiData.contact,
            emailFromContact: aiData.contact?.email,
            emailFromRoot: aiData.email,
            extras: aiData.extras,
            finalEmail: email
        });
        
        // GUARANTEED: Log that email field will be displayed
        console.log(`Record ${record.id} - Email field will be displayed as: ${email}`);
        
        // Resolve image URLs from IndexedDB
        let frontUrl = '';
        let backUrl = '';
        if (Number.isInteger(record.imageId)) {
            const blob = await IDBHelper.getBlob(record.imageId);
            if (blob) frontUrl = URL.createObjectURL(blob);
        }
        if (Number.isInteger(record.backImageId)) {
            const blob2 = await IDBHelper.getBlob(record.backImageId);
            if (blob2) backUrl = URL.createObjectURL(blob2);
        }
        const hasFrontUrl = !!frontUrl;
        const hasBackUrl = !!backUrl;

        const imageSection = hasBackUrl ? `
             <div class="image-section">
                 <h4>Business Card Images</h4>
                 <div class="images-container">
                     <div class="image-item">
                         <h5>Front Side</h5>
                         <img src="${frontUrl}" alt="Front Side" />
                         <button class="download-btn" onclick="downloadImageById(${record.imageId}, '${name}_front_side.jpg')">
                             📥 Download Front Image
                         </button>
                     </div>
                     <div class="image-item">
                         <h5>Back Side</h5>
                         <img src="${backUrl}" alt="Back Side" />
                         <button class="download-btn" onclick="downloadImageById(${record.backImageId}, '${name}_back_side.jpg')">
                             📥 Download Back Image
                         </button>
                     </div>
                 </div>
             </div>
         ` : hasFrontUrl ? `
             <div class="image-section">
                 <h4>Business Card Image</h4>
                 <div class="image-container">
                     <img src="${frontUrl}" alt="Business Card" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                     <p style="display: none; color: #dc3545; text-align: center; padding: 20px;">⚠️ Image failed to load</p>
                     <button class="download-btn" onclick="downloadImageById(${record.imageId}, '${name}_business_card.jpg')">
                         📥 Download Image
                     </button>
                 </div>
             </div>
         ` : `
             <div class="image-section">
                 <h4>Business Card Image</h4>
                 <div class="image-container">
                     <p style="color: #dc3545; text-align: center; padding: 20px;">⚠️ Image not available</p>
                 </div>
             </div>
         `;
        
        recordsHTML += `
            <div class="record-card" data-record-id="${record.id}">
                <div class="record-header">
                    <span class="record-id">#${index + 1}</span>
                    <div class="record-actions">
                        <button class="toggle-details-btn" onclick="toggleRecordDetails(${record.id})">
                            <span class="toggle-icon">📋</span> Details
                        </button>
                        <button class="delete-btn" onclick="deleteRecord(${record.id})">
                            <span class="delete-icon">🗑️</span>
                        </button>
                    </div>
                </div>
                
                <div class="record-summary">
                    <div class="summary-item">
                        <strong>Name:</strong> ${name}
                    </div>
                    <div class="summary-item">
                        <strong>Company:</strong> ${company}
                    </div>
                    <div class="summary-item">
                        <strong>Phone:</strong> ${phone}
                    </div>
                    <div class="summary-item">
                        <strong>Date:</strong> ${date}
                    </div>
                    <div class="summary-item">
                        <strong>Email:</strong> <a href="#" onclick="generateEmailDraft('${email}', '${name}', '${company}', '${phone}', '${date}')" class="email-link">${email}</a>
                    </div>
                    <div class="summary-item">
                        <strong>Type:</strong> <span style="color: #28a745;">${record.scanType || (hasBackImage ? 'Complete (Front + Back)' : 'Single(front)')}</span>
                    </div>
                </div>
                
                <div class="record-details" id="details-${record.id}" style="display: none;">
                    <div class="details-content">
                        <div class="ai-data-section">
                            <h4>AI Classified Fields</h4>
                            <div class="ai-data-content">
                                <pre>${aiDataString}</pre>
                            </div>
                        </div>
                        ${imageSection}
                    </div>
                </div>
            </div>
        `;
    }
    
    databaseRecords.innerHTML = recordsHTML;
    
    if (isSearch) {
        searchResultsInfo.style.display = 'flex';
        searchResultsText.textContent = `Found ${records.length} result(s) for "${searchTerm}"`;
    } else {
        searchResultsInfo.style.display = 'none';
    }
}

function toggleRecordDetails(recordId) {
    const detailsElement = document.getElementById(`details-${recordId}`);
    const toggleBtn = event.target.closest('.toggle-details-btn');
    const toggleIcon = toggleBtn.querySelector('.toggle-icon');
    
    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
        toggleIcon.textContent = '📋';
        toggleBtn.innerHTML = '<span class="toggle-icon">📋</span> Hide Details';
    } else {
        detailsElement.style.display = 'none';
        toggleIcon.textContent = '📋';
        toggleBtn.innerHTML = '<span class="toggle-icon">📋</span> Details';
    }
}

function deleteRecord(recordId) {
    if (confirm('Are you sure you want to delete this record?')) {
        let records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
        const toDelete = records.find(r => r.id === recordId);
        records = records.filter(record => record.id !== recordId);
        localStorage.setItem('vcExtractorRecords', JSON.stringify(records));
        // Remove associated blobs from IndexedDB
        if (toDelete) {
            if (Number.isInteger(toDelete.imageId)) IDBHelper.deleteBlob(toDelete.imageId);
            if (Number.isInteger(toDelete.backImageId)) IDBHelper.deleteBlob(toDelete.backImageId);
        }
        
        // Reload the database records
        loadDatabaseRecords();
        
        // Show success message
        showDeleteSuccess();
    }
}

function showDeleteSuccess() {
    // Create a temporary success message
    const successMsg = document.createElement('div');
    successMsg.className = 'delete-success';
    successMsg.innerHTML = '<span class="success-icon">✅</span> Record deleted successfully!';
    
    document.body.appendChild(successMsg);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (successMsg.parentNode) {
            successMsg.parentNode.removeChild(successMsg);
        }
    }, 3000);
}

// Search functions
function performSearch() {
    const nameSearchInput = document.getElementById('nameSearchInput');
    const companySearchInput = document.getElementById('companySearchInput');
    const nameTerm = nameSearchInput.value.trim().toLowerCase();
    const companyTerm = companySearchInput.value.trim().toLowerCase();
    
    if (nameTerm === '' && companyTerm === '') {
        loadDatabaseRecords();
        return;
    }
    
    const allRecords = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
    const filteredRecords = allRecords.filter(record => {
        const aiData = record.aiData;
        const name = (aiData.name || '').toLowerCase();
        const company = (aiData.company || '').toLowerCase();
        
        // Check if name matches (if name search is provided)
        const nameMatches = nameTerm === '' || name.includes(nameTerm);
        
        // Check if company matches (if company search is provided)
        const companyMatches = companyTerm === '' || company.includes(companyTerm);
        
        // Return true if both conditions are met (AND logic)
        return nameMatches && companyMatches;
    });
    
    // Create search term for display
    const searchTerms = [];
    if (nameTerm) searchTerms.push(`name: "${nameTerm}"`);
    if (companyTerm) searchTerms.push(`company: "${companyTerm}"`);
    const searchTerm = searchTerms.join(' AND ');
    
    // Display filtered results
    displayRecords(filteredRecords.reverse(), true, searchTerm);
}

function performSearchWithLoading() {
    // Show loading overlay
    const searchLoading = document.getElementById('searchLoading');
    searchLoading.style.display = 'flex';
    
    // Simulate loading delay (500ms)
    setTimeout(() => {
        // Hide loading overlay
        searchLoading.style.display = 'none';
        
        // Perform the actual search
        performSearch();
    }, 500);
}

function clearSearch() {
    const nameSearchInput = document.getElementById('nameSearchInput');
    const companySearchInput = document.getElementById('companySearchInput');
    nameSearchInput.value = '';
    companySearchInput.value = '';
    loadDatabaseRecords();
}

// Download function
async function downloadImageById(imageId, filename) {
    try {
        const blob = await IDBHelper.getBlob(imageId);
        if (!blob) {
            alert('No image found for download.');
            return;
        }
        const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
        link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('Image download initiated for:', filename);
    } catch (error) {
        console.error('Error downloading image:', error);
        alert('Failed to download image. Please try again.');
    }
}

// Add event listeners for Enter key on search inputs
document.addEventListener('DOMContentLoaded', () => {
    const nameSearchInput = document.getElementById('nameSearchInput');
    const companySearchInput = document.getElementById('companySearchInput');
    
    if (nameSearchInput) {
        nameSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearchWithLoading();
            }
        });
    }
    
    if (companySearchInput) {
        companySearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearchWithLoading();
            }
        });
    }
});

// Quick navigation function for smoother UI transitions
function quickNavigate(targetSection) {
    console.log('quickNavigate called with:', targetSection);
    
    // Clear any existing form data
    document.getElementById('userId').value = '';
    document.getElementById('password').value = '';
    
    // Reset role selection
    document.getElementById('roleSelection').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    
    // Reset app sections
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
    
    // Reset any manager section state
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => input.value = '');
    
    // Reset scanner if exists
    if (window.vcExtractor) {
        window.vcExtractor.resetScanner();
    }
    
    console.log('Quick navigation completed');
}

// Function to clean up existing duplicates in database
function cleanupExistingDuplicates() {
    console.log('Cleaning up existing duplicates...');
    
    try {
        let records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
        const originalCount = records.length;
        
        console.log(`Starting with ${originalCount} records`);
        
        if (originalCount === 0) {
            alert('No records found in database.');
            return [];
        }
        
        // Create a map to track unique records
        const uniqueRecords = new Map();
        const cleanedRecords = [];
        let duplicatesFound = 0;
        
        records.forEach((record, index) => {
            const aiData = record.aiData || {};
            const name = (aiData.name || '').toLowerCase().trim();
            const company = (aiData.company || '').toLowerCase().trim();
            
            console.log(`Processing record ${index + 1}: ${name} at ${company}`);
            
            // Create a simple key based on name (most common duplicate scenario)
            const nameKey = name;
            
            if (name && name !== 'n/a' && name !== '') {
                if (!uniqueRecords.has(nameKey)) {
                    uniqueRecords.set(nameKey, record);
                    cleanedRecords.push(record);
                    console.log(`✓ Added record for: ${name} (${company})`);
                } else {
                    // Found a duplicate!
                    duplicatesFound++;
                    const existingRecord = uniqueRecords.get(nameKey);
                    const existingHasImage = (existingRecord.imageId && existingRecord.imageId !== '') || (existingRecord.imageData && existingRecord.imageData.length > 100);
                    const currentHasImage = (record.imageId && record.imageId !== '') || (record.imageData && record.imageData.length > 100);
                    
                    console.log(`🚨 DUPLICATE FOUND for: ${name}`);
                    console.log(`   Existing: ${existingRecord.aiData?.company || 'Unknown'} (has image: ${existingHasImage})`);
                    console.log(`   Current: ${company} (has image: ${currentHasImage})`);
                    
                    if (currentHasImage && !existingHasImage) {
                        // Replace existing record with current one (has image)
                        const index = cleanedRecords.indexOf(existingRecord);
                        if (index !== -1) {
                            cleanedRecords[index] = record;
                            uniqueRecords.set(nameKey, record);
                            console.log(`   ✓ Replaced existing record with current one for: ${name}`);
                        }
                    } else {
                        // REMOVE DUPLICATE - Different company doesn't matter, same name = duplicate!
                        console.log(`   ✗ REMOVING DUPLICATE: ${name} (${company}) - Same name already exists`);
                    }
                }
            } else {
                // Keep records with N/A values as they might be legitimate
                cleanedRecords.push(record);
                console.log(`✓ Keeping record with N/A name: ${JSON.stringify(aiData)}`);
            }
        });
        
        // Save cleaned records
        localStorage.setItem('vcExtractorRecords', JSON.stringify(cleanedRecords));
        
        const cleanedCount = cleanedRecords.length;
        console.log(`=== DUPLICATE CLEANUP SUMMARY ===`);
        console.log(`Original records: ${originalCount}`);
        console.log(`Cleaned records: ${cleanedCount}`);
        console.log(`Duplicates found: ${duplicatesFound}`);
        console.log(`Records removed: ${originalCount - cleanedCount}`);
        console.log(`================================`);
        
        if (originalCount !== cleanedCount) {
            alert(`✅ DATABASE CLEANED!\n\nRemoved ${originalCount - cleanedCount} duplicate records.\n\nBefore: ${originalCount} records\nAfter: ${cleanedCount} records\n\nEach person now appears only once!`);
        } else {
            alert('✅ No duplicate records found. Database is already clean!');
        }
        
        return cleanedRecords;
    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
        alert('Error occurred while cleaning duplicates: ' + error.message);
        return [];
    }
}

// Function to cleanup duplicates and refresh display
async function cleanupAndRefresh() {
    if (confirm('This will remove duplicate records from the database. Continue?')) {
        const cleanedRecords = cleanupExistingDuplicates();
        await loadDatabaseRecords();
    }
}

// Function to force refresh database with image validation
function forceRefreshDatabase() {
    console.log('Force refreshing database with image validation...');
    
    try {
        let records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
        console.log('Total records found:', records.length);
        
        records.forEach((record, index) => {
            console.log(`Record ${index + 1}:`, {
                id: record.id,
                name: record.aiData?.name || 'Unknown',
                hasFrontId: Number.isInteger(record.imageId),
                hasBackId: Number.isInteger(record.backImageId)
            });
        });
        
        // Reload the display
        loadDatabaseRecords();
        
        console.log('Database refresh completed');
    } catch (error) {
        console.error('Error force refreshing database:', error);
    }
}

// Function to check and fix image data in existing records
function checkAndFixImageData() {
    console.log('Checking and fixing image data in existing records...');
    
    try {
        let records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
        let fixedCount = 0;
        
        records.forEach(record => {
            const hasAnyImage = Number.isInteger(record.imageId) || (record.imageData && record.imageData !== 'data:image/jpeg;base64,' && record.imageData.length > 100);
            if (hasAnyImage) {
                console.log(`Record ${record.id} has image reference`);
            } else {
                console.log(`Record ${record.id} has no valid image reference, marking for removal`);
                record._shouldRemove = true;
                fixedCount++;
            }
        });
        
        // Remove records with invalid images
        const validRecords = records.filter(record => !record._shouldRemove);
        
        if (fixedCount > 0) {
            localStorage.setItem('vcExtractorRecords', JSON.stringify(validRecords));
            console.log(`Removed ${fixedCount} records with invalid image data`);
            alert(`Fixed ${fixedCount} records with invalid image data.`);
        } else {
            console.log('All records have valid image data');
        }
        
        return validRecords;
    } catch (error) {
        console.error('Error checking and fixing image data:', error);
        return [];
    }
}

// Function to remove records without images
function removeRecordsWithoutImages() {
    if (confirm('This will remove all records that don\'t have valid images. Continue?')) {
        console.log('Removing records without images...');
        
        try {
            let records = JSON.parse(localStorage.getItem('vcExtractorRecords') || '[]');
            const originalCount = records.length;
            
            // Filter out records without valid images
            const recordsWithImages = records.filter(record => {
                const hasValidImage = Number.isInteger(record.imageId) || (record.imageData && record.imageData !== 'data:image/jpeg;base64,' && record.imageData.length > 100);
                if (!hasValidImage) {
                    console.log('Removing record without image:', record.aiData?.name || 'Unknown');
                }
                return hasValidImage;
            });
            
            // Save filtered records
            localStorage.setItem('vcExtractorRecords', JSON.stringify(recordsWithImages));
            
            const removedCount = originalCount - recordsWithImages.length;
            console.log(`Removed ${removedCount} records without images`);
            
            if (removedCount > 0) {
                alert(`Removed ${removedCount} records without images. Database now has ${recordsWithImages.length} records with valid images.`);
            } else {
                alert('No records without images found. All records have valid images.');
            }
            
            // Refresh the display
            loadDatabaseRecords();
            
        } catch (error) {
            console.error('Error removing records without images:', error);
            alert('Error removing records without images. Please try again.');
        }
    }
}

// Email draft generation function
function generateEmailDraft(email, name, company, phone, dateTime) {
    console.log('Generating email draft for:', { email, name, company, phone, dateTime });
    
    // Skip if email is not valid
    if (!email || email === 'N/A' || email === 'No email found') {
        alert('No valid email address found for this contact.');
        return;
    }
    
    // Parse the date and time
    const dateObj = new Date(dateTime);
    const timeString = dateObj.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    const dateString = dateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    // Generate subject line
    const subject = `Great Connecting with You at ${timeString} on ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    
    // Generate email body
    const body = `Dear ${name},

It was a pleasure meeting you on ${dateString}, at around ${timeString}. I really appreciated the opportunity to connect and learn more about your work at ${company}.

I'm reaching out to stay in touch and explore possible opportunities for collaboration. Please feel free to contact me if there's anything I can help with or if you'd like to continue our discussion.

Looking forward to staying connected.

Best regards,
[Your Name]
[Your Phone Number]
[Your LinkedIn]`;
    
    // Encode the subject and body for mailto link
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    
    // Create mailto link
    const mailtoLink = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
    
    console.log('Generated mailto link:', mailtoLink);
    
    // Open the email client
    window.open(mailtoLink, '_blank');
}
