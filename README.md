# VC Extractor - Business Card Scanner & Parser

A web-based application for scanning business cards using your device's camera and extracting contact information using AI.

## Features

- Camera-based business card scanning
- AI-powered text extraction using Google Cloud Vision API
- Contact information classification using Gemini AI
- Local database storage with IndexedDB
- Manager interface for viewing and managing records
- Search and filter capabilities
- Image download functionality

## Setup

### Prerequisites

- Modern web browser with camera access
- Google Cloud Vision API key
- Gemini AI API key

### API Keys Configuration

**IMPORTANT: Never commit API keys to version control!**

1. Copy `config.js.example` to `config.js`:
   ```bash
   cp config.js.example config.js
   ```

2. Edit `config.js` and add your API keys:
   ```javascript
   const config = {
       // Google Cloud Vision API Key
       GOOGLE_CLOUD_VISION_API_KEY: 'your_google_cloud_vision_api_key_here',
       
       // Gemini API Key
       GEMINI_API_KEY: 'your_gemini_api_key_here'
   };
   ```

3. Ensure `config.js` is in your `.gitignore` file to prevent accidental commits.

### Getting API Keys

#### Google Cloud Vision API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Cloud Vision API
4. Create credentials (API key)
5. Copy the API key to your `config.js` file

#### Gemini AI API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key to your `config.js` file

## Usage

1. Open `index.html` in your web browser
2. Select your role (User or Manager)
3. Login with credentials (admin/admin123 for testing)
4. For User role: Use camera to scan business cards
5. For Manager role: View, search, and manage database records

## Security Notes

- API keys are stored in `config.js` which should never be committed to version control
- The application runs entirely in the browser - no server-side storage of sensitive data
- All data is stored locally using IndexedDB and localStorage

## File Structure

- `index.html` - Main application interface
- `script.js` - Core application logic
- `styles.css` - Application styling
- `config.js` - API key configuration (not in version control)
- `.gitignore` - Prevents config.js from being committed

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (limited camera support)

## Troubleshooting

- Ensure camera permissions are granted
- Check that API keys are correctly configured in `config.js`
- Verify internet connection for API calls
- Clear browser cache if experiencing issues

## License

This project is for educational and personal use.
