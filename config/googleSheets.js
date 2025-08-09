const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class GoogleSheetsConfig {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  async initialize() {
    try {
      // Method 1: Using OAuth2 credentials file
      if (process.env.GOOGLE_CREDENTIALS_FILE_PATH) {
        await this.initializeWithOAuth2File();
      }
      // Method 2: Using OAuth2 environment variables
      else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        await this.initializeWithOAuth2Env();
      }
      // Method 3: Using service account (legacy)
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        await this.initializeWithServiceAccount();
      }
      else {
        throw new Error('Google Sheets credentials not found. Please set up credentials in .env file or credentials file.');
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets API initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Google Sheets:', error.message);
      throw error;
    }
  }

  async initializeWithOAuth2File() {
    const credentialsPath = path.resolve(process.env.GOOGLE_CREDENTIALS_FILE_PATH);
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found at: ${credentialsPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // For OAuth2 credentials, we need to use OAuth2 client
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || credentials;
    
    this.auth = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // For now, we'll use a simple approach - you might need to handle token refresh
    // In a real app, you'd want to implement proper OAuth2 flow
    console.log('⚠️ OAuth2 credentials detected. You may need to implement token refresh.');
  }

  async initializeWithOAuth2Env() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';
    
    this.auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    console.log('⚠️ OAuth2 credentials detected. You may need to implement token refresh.');
  }

  async initializeWithServiceAccount() {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
  }

  async getSheetsInstance() {
    if (!this.sheets) {
      await this.initialize();
    }
    return this.sheets;
  }

  getSheetId() {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      throw new Error('GOOGLE_SHEETS_ID not found in environment variables');
    }
    return sheetId;
  }
}

module.exports = new GoogleSheetsConfig(); 