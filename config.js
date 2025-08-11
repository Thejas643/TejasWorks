// Configuration file for API keys
// IMPORTANT: Keep this file secure and don't commit it to version control
const config = {
    // Google Cloud Vision API Key
    GOOGLE_CLOUD_VISION_API_KEY: 'AIzaSyAEZuFlPS76LDzhVJ06RcP-eE53Qimj0dg',
    
    // Gemini API Key
    GEMINI_API_KEY: 'AIzaSyBHl3haIlj3rVLIRtfQnPuaMH0raqU6p5Y'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    // For browser usage
    window.config = config;
}
