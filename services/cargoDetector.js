const sheetManager = require('./sheetManager');

class CargoDetector {
  constructor() {
    this.cargoStartRow = 13; // Row where actual cargo data starts (after headers)
    this.dateColumn = 'B'; // Column B contains dates
    this.awbColumn = 'C'; // Column C contains AWB numbers
    this.sistemColumn = 'K'; // Column K contains "Sistem" values (pcs)
    this.paymentColumns = ['I', 'J', 'K', 'L', 'M']; // Payment columns
  }

  /**
   * Get today's date in the format used in the sheet (e.g., "Jul 3", "Aug 3")
   * @returns {string} Today's date in sheet format
   */
  getTodayDateString() {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    return `${month} ${day}`;
  }

  /**
   * Check if a string is a valid AWB number (long numeric string)
   * @param {string} value - Value to check
   * @returns {boolean} True if it's a valid AWB number
   */
  isValidAWB(value) {
    if (!value || typeof value !== 'string') return false;
    
    // AWB should be a long numeric string (typically 12+ digits)
    const numericPattern = /^\d{10,}$/;
    
    // Include "1 Shopee" as valid entry
    const shopeePattern = /^1\s*shopee$/i;
    
    return numericPattern.test(value) || shopeePattern.test(value);
  }

  /**
   * Parse numeric value from string (handle commas, etc.)
   * @param {string} value - String value to parse
   * @returns {number} Parsed number or 0
   */
  parseNumericValue(value) {
    if (!value || typeof value !== 'string') return 0;
    
    // Remove commas and other non-numeric characters except decimal point and minus
    const cleanValue = value.replace(/[^\d.-]/g, '');
    
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Get cargo data for today
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<Object>} Today's cargo data
   */
  async getTodayCargo(sheetName) {
    try {
      const todayDate = this.getTodayDateString();
      console.log(`📦 Looking for cargo data for: ${todayDate}`);
      
      // Read cargo section (from row 9 onwards)
      const cargoRange = `${this.dateColumn}${this.cargoStartRow}:${this.sistemColumn}1000`;
      const cargoData = await sheetManager.getSheetData(sheetName, cargoRange);
      
      if (!cargoData || cargoData.length === 0) {
        return {
          date: todayDate,
          totalAWB: 0,
          totalPcs: 0,
          awbList: [],
          error: 'No cargo data found'
        };
      }
      
      // Find rows for today's date
      const todayRows = [];
      const awbList = [];
      let totalPcs = 0;
      let totalAWB = 0;
      
      let currentDate = null;
      
      cargoData.forEach((row, index) => {
        const rowNumber = this.cargoStartRow + index;
        const dateValue = row[1]; // Column B (date)
        const awbValue = row[3]; // Column D (AWB) - index 3 for column D
        const sistemValue = row[10]; // Column K (Sistem) - index 10 for column K
        
        // Check if this row has a date
        if (dateValue && dateValue.toString && dateValue.toString().trim() !== '') {
          const dateDay = dateValue.toString().padStart(2, '0');
          const todayDay = todayDate.split(' ')[1];
          
          if (dateDay === todayDay) {
            currentDate = dateDay;
          } else {
            currentDate = null;
          }
        }
        
        // If we're in today's date section, process the row
        if (currentDate === todayDate.split(' ')[1]) {
          todayRows.push({
            row: rowNumber,
            date: currentDate,
            awb: awbValue,
            sistem: sistemValue
          });
          
          // Check if this is a valid AWB entry
          if (this.isValidAWB(awbValue)) {
            const pcs = this.parseNumericValue(sistemValue);
            awbList.push({
              awb: awbValue,
              pcs: pcs,
              row: rowNumber
            });
            totalPcs += pcs;
            totalAWB++;
          }
        }
      });
      
      return {
        date: todayDate,
        totalAWB: totalAWB,
        totalPcs: totalPcs,
        awbList: awbList,
        allTodayRows: todayRows,
        error: null
      };
      
    } catch (error) {
      console.error('❌ Error getting today\'s cargo:', error.message);
      throw error;
    }
  }

  /**
   * Get cargo data for a specific date
   * @param {string} sheetName - Name of the sheet
   * @param {string} dateString - Date string (e.g., "Jul 3")
   * @returns {Promise<Object>} Cargo data for the specified date
   */
  async getCargoForDate(sheetName, dateString) {
    try {
      console.log(`📦 Looking for cargo data for: ${dateString}`);
      
      // Read cargo section (from row 9 onwards)
      const cargoRange = `${this.dateColumn}${this.cargoStartRow}:${this.sistemColumn}1000`;
      const cargoData = await sheetManager.getSheetData(sheetName, cargoRange);
      
      if (!cargoData || cargoData.length === 0) {
        return {
          date: dateString,
          totalAWB: 0,
          totalPcs: 0,
          awbList: [],
          error: 'No cargo data found'
        };
      }
      
      // Find rows for the specified date
      const targetRows = [];
      const awbList = [];
      let totalPcs = 0;
      let totalAWB = 0;
      
      cargoData.forEach((row, index) => {
        const rowNumber = this.cargoStartRow + index;
        const dateValue = row[0]; // Column A (date)
        const awbValue = row[1]; // Column B (AWB)
        const sistemValue = row[10]; // Column K (Sistem)
        
        // Check if this row is for the target date (date format: "01", "02", "03", etc.)
        const targetDay = dateString.split(' ')[1];
        const dateDay = dateValue.toString().padStart(2, '0');
        if (dateValue && dateDay === targetDay) {
          targetRows.push({
            row: rowNumber,
            date: dateValue,
            awb: awbValue,
            sistem: sistemValue
          });
          
          // Check if this is a valid AWB entry
          if (this.isValidAWB(awbValue)) {
            const pcs = this.parseNumericValue(sistemValue);
            awbList.push({
              awb: awbValue,
              pcs: pcs,
              row: rowNumber
            });
            totalPcs += pcs;
            totalAWB++;
          }
        }
      });
      
      return {
        date: dateString,
        totalAWB: totalAWB,
        totalPcs: totalPcs,
        awbList: awbList,
        allTargetRows: targetRows,
        error: null
      };
      
    } catch (error) {
      console.error(`❌ Error getting cargo for date ${dateString}:`, error.message);
      throw error;
    }
  }

  /**
   * Get payment summary for today
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<Object>} Payment summary
   */
  async getTodayPaymentSummary(sheetName) {
    try {
      const todayDate = this.getTodayDateString();
      
      // Read cargo section with payment columns
      const paymentRange = `${this.dateColumn}${this.cargoStartRow}:${this.paymentColumns[this.paymentColumns.length - 1]}1000`;
      const paymentData = await sheetManager.getSheetData(sheetName, paymentRange);
      
      if (!paymentData || paymentData.length === 0) {
        return {
          date: todayDate,
          tunai: 0,
          mandiri: 0,
          bca: 0,
          dfod: 0,
          packing: 0,
          total: 0,
          error: 'No payment data found'
        };
      }
      
      let tunai = 0, mandiri = 0, bca = 0, dfod = 0, packing = 0;
      
      paymentData.forEach((row) => {
        const dateValue = row[0]; // Column A (date)
        
        // Check if this row is for today (date format: "01", "02", "03", etc.)
        const todayDay = todayDate.split(' ')[1];
        const dateDay = dateValue.toString().padStart(2, '0');
        if (dateValue && dateDay === todayDay) {
          // Parse payment values (columns C-G)
          tunai += this.parseNumericValue(row[2] || 0); // Column C
          mandiri += this.parseNumericValue(row[3] || 0); // Column D
          bca += this.parseNumericValue(row[4] || 0); // Column E
          dfod += this.parseNumericValue(row[5] || 0); // Column F
          packing += this.parseNumericValue(row[6] || 0); // Column G
        }
      });
      
      const total = tunai + mandiri + bca + dfod + packing;
      
      return {
        date: todayDate,
        tunai: tunai,
        mandiri: mandiri,
        bca: bca,
        dfod: dfod,
        packing: packing,
        total: total,
        error: null
      };
      
    } catch (error) {
      console.error('❌ Error getting payment summary:', error.message);
      throw error;
    }
  }
}

module.exports = new CargoDetector(); 