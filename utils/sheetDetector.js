/**
 * Sheet Detector Utility
 * Automatically determines which sheet to read based on current month and year
 * Format: MMMYY (e.g., AUG25, JUL25)
 */

class SheetDetector {
  constructor() {
    this.monthNames = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
  }

  /**
   * Get current month and year in MMMYY format
   * @returns {string} Current month and year (e.g., "AUG25")
   */
  getCurrentSheetName() {
    const now = new Date();
    const month = this.monthNames[now.getMonth()];
    const year = now.getFullYear().toString().slice(-2); // Get last 2 digits
    return `${month}${year}`;
  }

  /**
   * Get previous month and year in MMMYY format
   * @returns {string} Previous month and year (e.g., "JUL25")
   */
  getPreviousSheetName() {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = this.monthNames[previousMonth.getMonth()];
    const year = previousMonth.getFullYear().toString().slice(-2);
    return `${month}${year}`;
  }

  /**
   * Get next month and year in MMMYY format
   * @returns {string} Next month and year (e.g., "SEP25")
   */
  getNextSheetName() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const month = this.monthNames[nextMonth.getMonth()];
    const year = nextMonth.getFullYear().toString().slice(-2);
    return `${month}${year}`;
  }

  /**
   * Find the best available sheet from a list of sheet names
   * Priority: Current month > Previous month > Next month
   * @param {Array} availableSheets - Array of sheet names
   * @returns {string|null} Best matching sheet name or null if not found
   */
  findBestSheet(availableSheets) {
    const currentSheet = this.getCurrentSheetName();
    const previousSheet = this.getPreviousSheetName();
    const nextSheet = this.getNextSheetName();

    // Priority order: Current > Previous > Next
    if (availableSheets.includes(currentSheet)) {
      return currentSheet;
    }

    if (availableSheets.includes(previousSheet)) {
      return previousSheet;
    }

    if (availableSheets.includes(nextSheet)) {
      return nextSheet;
    }

    return null;
  }

  /**
   * Get sheet name for a specific date
   * @param {Date} date - Date to get sheet name for
   * @returns {string} Sheet name in MMMYY format
   */
  getSheetNameForDate(date) {
    const month = this.monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${month}${year}`;
  }

  /**
   * Validate if a sheet name follows MMMYY format
   * @param {string} sheetName - Sheet name to validate
   * @returns {boolean} True if valid format
   */
  isValidSheetFormat(sheetName) {
    const pattern = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2}$/;
    return pattern.test(sheetName);
  }

  /**
   * Get all possible sheet names for the last 12 months
   * @returns {Array} Array of sheet names
   */
  getLast12Months() {
    const sheets = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      sheets.push(this.getSheetNameForDate(date));
    }
    
    return sheets;
  }
}

module.exports = new SheetDetector(); 