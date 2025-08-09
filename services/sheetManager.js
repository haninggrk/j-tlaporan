const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const sheetDetector = require('../utils/sheetDetector');
require('dotenv').config({ path: './config.env' });

class SheetManager {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.sheetId = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Load service account credentials
      const credentialsPath = path.resolve('./credentials/service-account-andy.json');
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      // Create Google Auth client
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      
      // Create Google Sheets client
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Get sheet ID from environment
      this.sheetId = process.env.GOOGLE_SHEETS_ID;
      
      if (!this.sheetId) {
        throw new Error('GOOGLE_SHEETS_ID not found in environment variables');
      }
      
    } catch (error) {
      console.error('❌ Error initializing Sheet Manager:', error.message);
      throw error;
    }
  }

  /**
   * Get all available sheets in the spreadsheet
   * @returns {Promise<Array>} Array of sheet names
   */
  async getAvailableSheets() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetId,
      });
      
      const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
      return sheetNames;
      
    } catch (error) {
      console.error('❌ Error getting available sheets:', error.message);
      throw error;
    }
  }

  /**
   * Automatically detect and get the best sheet to read
   * @returns {Promise<string|null>} Sheet name or null if not found
   */
  async getTargetSheet() {
    try {
      const availableSheets = await this.getAvailableSheets();
      const targetSheet = sheetDetector.findBestSheet(availableSheets);
      
      if (!targetSheet) {
        return null;
      }
      
      return targetSheet;
      
    } catch (error) {
      console.error('❌ Error getting target sheet:', error.message);
      throw error;
    }
  }

  /**
   * Get data from a specific sheet
   * @param {string} sheetName - Name of the sheet to read
   * @param {string} range - Range to read (e.g., 'A1:Z1000')
   * @returns {Promise<Array>} Sheet data
   */
  async getSheetData(sheetName, range = 'A1:Z1000') {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${sheetName}!${range}`,
      });
      
      const data = response.data.values;
      
      if (!data || data.length === 0) {
        return [];
      }
      
      return data;
      
    } catch (error) {
      console.error(`❌ Error reading sheet "${sheetName}":`, error.message);
      throw error;
    }
  }

  /**
   * Get data from the automatically detected target sheet
   * @param {string} range - Range to read (e.g., 'A1:Z1000')
   * @returns {Promise<Object>} Object with sheet name and data
   */
  async getTargetSheetData(range = 'A1:Z1000') {
    try {
      const targetSheet = await this.getTargetSheet();
      
      if (!targetSheet) {
        return { sheetName: null, data: null, error: 'No suitable sheet found' };
      }
      
      const data = await this.getSheetData(targetSheet, range);
      
      return {
        sheetName: targetSheet,
        data: data,
        error: null
      };
      
    } catch (error) {
      console.error('❌ Error getting target sheet data:', error.message);
      return { sheetName: null, data: null, error: error.message };
    }
  }

  /**
   * Get sheet metadata (title, size, etc.)
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<Object>} Sheet metadata
   */
  async getSheetMetadata(sheetName) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetId,
        ranges: [`${sheetName}!A1:A1`],
        fields: 'sheets.properties'
      });
      
      const sheet = response.data.sheets[0];
      return {
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
        rowCount: sheet.properties.gridProperties?.rowCount,
        columnCount: sheet.properties.gridProperties?.columnCount
      };
      
    } catch (error) {
      console.error(`❌ Error getting metadata for "${sheetName}":`, error.message);
      throw error;
    }
  }

  /**
   * Validate if a sheet exists
   * @param {string} sheetName - Name of the sheet to check
   * @returns {Promise<boolean>} True if sheet exists
   */
  async sheetExists(sheetName) {
    try {
      const availableSheets = await this.getAvailableSheets();
      return availableSheets.includes(sheetName);
    } catch (error) {
      console.error('❌ Error checking sheet existence:', error.message);
      return false;
    }
  }
}

module.exports = new SheetManager(); 