# VC Extractor - Business Card Scanner & Parser

## 📋 Introduction

VC Extractor is a modern web application that transforms business card management through AI-powered text extraction and intelligent contact classification. Built as a client-side application with optional server components, it provides a seamless experience for scanning, processing, and organizing business card information.

### 🎯 Key Features
- **Real-time Camera Scanning**: Live camera feed with instant image capture
- **AI-Powered Text Extraction**: Google Cloud Vision API for accurate OCR
- **Intelligent Contact Classification**: Gemini AI for structured data extraction
- **Dual-Side Scanning**: Support for front and back business card scanning
- **Local Database Storage**: IndexedDB for images, localStorage for metadata
- **Responsive Web Interface**: Mobile-first design with modern UI/UX
- **Manager Dashboard**: Comprehensive record management and search capabilities

## 🏗️ Tech Stack & Architecture

### **Frontend Technologies**
- **HTML5**: Semantic markup and modern web standards
- **CSS3**: Responsive design, animations, and modern styling
- **JavaScript ES6+**: Modern JavaScript with async/await, Promises, and ES6+ features
- **Progressive Web App (PWA)**: Offline-capable web application

### **Backend Options**
- **Python HTTP Server**: Built-in `http.server` and `socketserver` modules
- **Node.js Server**: Express.js alternative server implementation
- **Client-Side Only**: Direct file access without server requirements

### **Data Storage**
- **IndexedDB**: Local database for storing image blobs and large binary data
- **localStorage**: Metadata storage for contact information and app state
- **sessionStorage**: Temporary session data management

### **AI & External Services**
- **Google Cloud Vision API**: Optical Character Recognition (OCR) for text extraction
- **Gemini AI API**: Natural Language Processing for contact information classification
- **RESTful API Integration**: HTTP-based communication with external services

### **Browser APIs & Features**
- **getUserMedia API**: Camera access and video stream handling
- **Canvas API**: Image processing and manipulation
- **File API**: File handling and blob management
- **Fetch API**: HTTP requests and API communication
- **IndexedDB API**: Local database operations
- **Web Workers**: Background processing capabilities

## 📦 Package Dependencies

### **Python Packages (requirements.txt)**
```bash
pip install -r requirements.txt
```

**Core Dependencies:**
- `python-version>=3.12.3` - Python version requirement
- `flask==3.0.0` - Web framework for enhanced server
- `flask-cors==4.0.0` - Cross-origin resource sharing
- `streamlit==1.29.0` - Alternative web interface framework

**Development Tools:**
- `black==23.12.1` - Code formatter
- `flake8==7.0.0` - Linter
- `pylint==3.0.3` - Code analysis
- `pytest==7.4.4` - Testing framework
- `pytest-cov==4.1.0` - Coverage testing

**Utility Packages:**
- `requests==2.31.0` - HTTP requests
- `python-dotenv==1.0.0` - Environment variables
- `click==8.1.7` - Command line interface

**Google AI Services:**
- `google-cloud-vision==3.4.4` - Google Cloud Vision API client
- `google-generativeai==0.3.2` - Gemini AI API client

**Documentation:**
- `sphinx==7.2.6` - Documentation generator
- `sphinx-rtd-theme==2.0.0` - ReadTheDocs theme

### **Node.js Dependencies (package.json)**
```bash
npm install
```

**Server Dependencies:**
- Built-in Node.js modules (http, fs, path)
- No external npm packages required

### **Browser Dependencies**
- **No installation required** - All APIs are built into modern browsers
- **Minimum Browser Versions:**
  - Chrome: 90.0+
  - Firefox: 88.0+
  - Safari: 14.0+
  - Edge: 90.0+

## 🚀 How the Project Works

### **1. Application Flow**
```
User Login → Role Selection → Camera Access → Image Capture → 
AI Processing → Data Classification → Database Storage → Management Interface
```

### **2. Core Components**

#### **Authentication System**
- Role-based access (User/Manager)
- Simple credential validation
- Session management

#### **Camera & Image Capture**
- **Camera Access**: `getUserMedia()` API for device camera
- **Image Capture**: Canvas-based image processing
- **Quality Optimization**: Multiple capture attempts with fallback methods
- **Dual-Side Support**: Front and back business card scanning

#### **AI Processing Pipeline**
1. **Text Extraction**: Google Cloud Vision API processes captured images
2. **Data Classification**: Gemini AI analyzes extracted text
3. **Structured Output**: JSON format with categorized contact fields
4. **Error Handling**: Fallback data and retry mechanisms

#### **Data Storage System**
- **IndexedDB**: Stores image blobs with unique IDs
- **localStorage**: Stores contact metadata and relationships
- **Data Integrity**: Validation and duplicate checking
- **Storage Management**: Capacity monitoring and cleanup

### **3. Image Upload & Processing**

#### **Image Capture Process**
```javascript
// 1. Camera stream initialization
const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
});

// 2. Image capture with quality optimization
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

// 3. Blob creation and storage
canvas.toBlob((blob) => {
    const imageId = await IDBHelper.saveBlob(blob);
    // Store imageId in localStorage with contact data
}, 'image/jpeg', 0.8);
```

#### **Image Storage Architecture**
- **Raw Storage**: IndexedDB stores actual image blobs
- **Metadata Storage**: localStorage stores image IDs and contact information
- **Relationship Mapping**: Links between images and contact records
- **Efficient Retrieval**: On-demand image loading with URL.createObjectURL()

#### **Image Processing Features**
- **Quality Optimization**: Progressive quality reduction for storage efficiency
- **Format Conversion**: JPEG compression with configurable quality
- **Size Management**: Automatic resizing and compression
- **Error Recovery**: Multiple capture attempts with different settings

## 🧪 Testing Procedures

### **Backend Testing**

#### **Python Server Testing**
```bash
# 1. Install testing dependencies
pip install pytest pytest-cov

# 2. Run tests
pytest

# 3. Run with coverage
pytest --cov=.

# 4. Run specific test file
pytest test_server.py

# 5. Run with verbose output
pytest -v
```

#### **Node.js Server Testing**
```bash
# 1. Install testing dependencies
npm install --save-dev jest

# 2. Run tests
npm test

# 3. Run with coverage
npm run test:coverage
```

#### **API Testing**
```bash
# Test Google Cloud Vision API
curl -X POST "https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"requests":[{"image":{"content":"base64_image_data"},"features":[{"type":"TEXT_DETECTION"}]}]}'

# Test Gemini AI API
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Test prompt"}]}]}'
```

### **Frontend Testing**

#### **Browser Testing**
```bash
# 1. Open browser developer tools (F12)
# 2. Test camera access
# 3. Test image capture
# 4. Test AI processing
# 5. Test database operations
```

#### **Manual Testing Checklist**
- [ ] Camera permissions granted
- [ ] Image capture working
- [ ] AI text extraction successful
- [ ] Data classification accurate
- [ ] Database storage functional
- [ ] Search and filter working
- [ ] Image download working
- [ ] Responsive design on mobile

#### **Automated Frontend Testing**
```bash
# Install testing framework
npm install --save-dev jest puppeteer

# Run browser tests
npm run test:browser

# Run visual regression tests
npm run test:visual
```

### **Integration Testing**

#### **End-to-End Testing**
```bash
# 1. Start server
python start_server.py

# 2. Open application
# 3. Complete business card scanning workflow
# 4. Verify data persistence
# 5. Test manager interface
```

#### **Performance Testing**
```bash
# Test image processing speed
# Test database query performance
# Test memory usage
# Test storage capacity limits
```

## 🔧 Setup & Installation

### **Prerequisites**
- Python 3.12.3+
- Node.js 22.17.0+ (optional)
- Modern web browser with ES6+ support
- Google Cloud Vision API key
- Gemini AI API key

### **Installation Steps**

#### **1. Clone/Download Project**
```bash
git clone <repository-url>
cd VC Extractor
```

#### **2. Install Python Dependencies**
```bash
pip install -r requirements.txt
```

#### **3. Configure API Keys**
```bash
# Copy example config
cp config.js.example config.js

# Edit config.js with your API keys
nano config.js
```

#### **4. Start Server**
```bash
# Python server (recommended)
python start_server.py

# Node.js server (alternative)
npm start
```

#### **5. Access Application**
- Open browser to `http://localhost:8000`
- Grant camera permissions
- Start scanning business cards

## 📱 Usage Instructions

### **User Role**
1. **Select Role**: Choose "User" from login screen
2. **Login**: Use credentials (admin/admin123 for testing)
3. **Start Scanning**: Click "Start Scanning" button
4. **Capture Image**: Position business card and click "Capture Image"
5. **Process Results**: Wait for AI processing to complete
6. **Scan Back Side**: Choose to scan back side if needed
7. **Complete**: Finish scanning and view extracted data

### **Manager Role**
1. **Select Role**: Choose "Manager" from login screen
2. **Login**: Use credentials (admin/admin123 for testing)
3. **View Records**: See all scanned business cards
4. **Search & Filter**: Use search functionality to find specific contacts
5. **Manage Data**: Delete records, download images, view details
6. **Storage Management**: Monitor storage usage and cleanup

## 🔒 Security & Privacy

### **Data Protection**
- **Local Storage**: All data stored locally on user's device
- **No Server Storage**: No personal data sent to external servers
- **API Key Security**: API keys stored in config.js (not in version control)
- **HTTPS Required**: Camera access requires secure connection

### **API Key Management**
- Store API keys in `config.js` (not committed to git)
- Use `.gitignore` to prevent accidental commits
- Rotate API keys regularly
- Monitor API usage and quotas

## 🚨 Troubleshooting

### **Common Issues**

#### **Camera Not Working**
- Check browser permissions
- Ensure HTTPS connection
- Try different browser
- Check device camera availability

#### **API Errors**
- Verify API keys in config.js
- Check internet connection
- Monitor API quotas
- Review API response logs

#### **Storage Issues**
- Clear browser cache
- Use "Clear All Cache & Data" button
- Check available disk space
- Monitor IndexedDB storage limits

#### **Server Connection Issues**
- Verify port 8000 is available
- Check firewall settings
- Try different port in server configuration
- Restart server process

## 📈 Performance Optimization

### **Image Processing**
- Progressive quality reduction
- Efficient blob storage
- Lazy loading of images
- Compression optimization

### **Database Operations**
- IndexedDB for large files
- localStorage for metadata
- Efficient query patterns
- Regular cleanup operations

### **Memory Management**
- Garbage collection optimization
- Blob URL cleanup
- Canvas memory management
- Event listener cleanup

## 🔮 Future Enhancements

### **Planned Features**
- Cloud backup integration
- Advanced search algorithms
- Contact synchronization
- Export to CRM systems
- Mobile app development
- Multi-language support

### **Technical Improvements**
- Service Worker implementation
- Progressive Web App features
- Advanced caching strategies
- Real-time collaboration
- Machine learning improvements

## 📄 License

This project is for educational and personal use. Please respect the terms of service for Google Cloud Vision API and Gemini AI API.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

For issues and questions:
- Check troubleshooting section
- Review browser console logs
- Verify API key configuration
- Test with different devices/browsers

---

**VC Extractor** - Transforming business card management through AI innovation! 🚀
