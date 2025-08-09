const sheetManager = require('./sheetManager');

class AttendanceDetector {
  constructor() {
    this.dateRow = 4; // Row 4 contains the dates
    this.employeeRows = [6, 7]; // Rows 6 and 7 contain employee data
    this.employeeNameColumn = 1; // Column B (index 1) contains employee names
  }

  /**
   * Get today's date as a number (1-31)
   * @returns {number} Today's date
   */
  getTodayDate() {
    return new Date().getDate();
  }

  /**
   * Find column index for a specific date
   * @param {Array} dateRow - Row 4 data containing dates
   * @param {number} targetDate - Date to find (1-31)
   * @returns {number|null} Column index for the date, or null if not found
   */
  findDateColumn(dateRow, targetDate) {
    for (let i = 0; i < dateRow.length; i++) {
      if (dateRow[i] && dateRow[i].toString() === targetDate.toString()) {
        return i;
      }
    }
    return null;
  }

  /**
   * Get employee names from the sheet
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<Array>} Array of employee names
   */
  async getEmployeeNames(sheetName) {
    try {
      // Read from row 6 to row 8 (before "2. CARGO" section)
      const range = `${this.employeeNameColumn}${this.employeeStartRow}:${this.employeeNameColumn}${this.cargoSectionRow - 1}`;
      const data = await sheetManager.getSheetData(sheetName, range);
      
      // Filter out empty cells and extract employee names
      const employees = [];
      data.forEach((row, index) => {
        if (row && row[0] && row[0].trim() !== '') {
          employees.push({
            name: row[0].trim(),
            row: this.employeeStartRow + index
          });
        }
      });
      
      return employees;
    } catch (error) {
      console.error('❌ Error getting employee names:', error.message);
      throw error;
    }
  }

  /**
   * Get today's attendance for all employees
   * @param {string} sheetName - Name of the sheet
   * @param {number} targetDate - Optional specific date to check (defaults to today)
   * @returns {Promise<Object>} Today's attendance data
   */
  async getTodayAttendance(sheetName, targetDate = null) {
    try {
      const today = targetDate || this.getTodayDate();
      
      // First, find where "CARGO" starts in column B to determine employee range
      const searchData = await sheetManager.getSheetData(sheetName, 'B1:B50');
      let cargoRowIndex = -1;
      
      for (let i = 0; i < searchData.length; i++) {
        const cellValue = searchData[i][0];
        if (cellValue && cellValue.toString().toUpperCase().includes('CARGO')) {
          cargoRowIndex = i + 1; // Convert to 1-based row number
          break;
        }
      }
      
      if (cargoRowIndex === -1) {
        throw new Error('CARGO section not found');
      }
      
      // Read the attendance data range from A3 to row before CARGO, extending columns to BM
      const attendanceData = await sheetManager.getSheetData(sheetName, `A3:BM${cargoRowIndex - 1}`);
      
      if (!attendanceData || attendanceData.length < 3) {
        throw new Error('Insufficient attendance data');
      }
      
      // Row 4 contains dates (index 1 in our array)
      const dateRow = attendanceData[1];
      
      // Find column for today's date
      const dateColumnIndex = this.findDateColumn(dateRow, today);
      
      if (dateColumnIndex === null) {
        // Return empty attendance if date not found
        return {
          date: today,
          totalEmployees: 0,
          presentEmployees: 0,
          absentEmployees: 0,
          attendance: []
        };
      }
      
      // Find all employees (starting from row 6, which is index 3 in our array)
      const employees = [];
      for (let i = 3; i < attendanceData.length; i++) {
        const row = attendanceData[i];
        const employeeName = row[1]; // Column B (index 1)
        
        if (employeeName && employeeName.toString().trim() !== '') {
          employees.push({
            name: employeeName.toString().trim(),
            row: row,
            rowIndex: i + 3 // Convert back to sheet row number
          });
        }
      }
      
      const attendanceResults = [];
      
      for (const employee of employees) {
        let inTime = employee.row[dateColumnIndex] || null;
        let outTime = employee.row[dateColumnIndex + 1] || null;
        
        // Clean up the time values
        if (inTime && inTime.toString().toLowerCase() === 'off') inTime = 'Off';
        if (outTime && outTime.toString().toLowerCase() === 'off') outTime = 'Off';
        
        // Fix: If in is empty but out has time (and it's not "Off"), swap them
        if (!inTime && outTime && outTime !== 'Off') {
          inTime = outTime;
          outTime = null;
        }
        
        attendanceResults.push({
          name: employee.name,
          date: today,
          inTime: inTime,
          outTime: outTime,
          isPresent: !!(inTime || outTime)
        });
      }
      
      return {
        date: today,
        totalEmployees: employees.length,
        presentEmployees: attendanceResults.filter(a => a.isPresent).length,
        absentEmployees: attendanceResults.filter(a => !a.isPresent).length,
        attendance: attendanceResults
      };
      
    } catch (error) {
      console.error('❌ Error getting today\'s attendance:', error.message);
      throw error;
    }
  }

  /**
   * Get next column letter
   * @param {string} column - Current column letter
   * @returns {string} Next column letter
   */
  getNextColumn(column) {
    return String.fromCharCode(column.charCodeAt(0) + 1);
  }

  /**
   * Get attendance for a specific date
   * @param {string} sheetName - Name of the sheet
   * @param {number} date - Date (1-31)
   * @returns {Promise<Object>} Attendance data for the specified date
   */
  async getAttendanceForDate(sheetName, date) {
    try {
      const targetColumn = this.getColumnForDate(date);
      
      // Get employee names
      const employees = await this.getEmployeeNames(sheetName);
      
      // Get attendance data for the specified date
      const attendanceData = [];
      
      for (const employee of employees) {
        const inColumn = targetColumn;
        const outColumn = this.getNextColumn(targetColumn);
        
        // Read in time
        const inRange = `${inColumn}${employee.row}`;
        const inData = await sheetManager.getSheetData(sheetName, inRange);
        let inTime = inData && inData[0] && inData[0][0] ? inData[0][0] : null;
        
        // Read out time
        const outRange = `${outColumn}${employee.row}`;
        const outData = await sheetManager.getSheetData(sheetName, outRange);
        let outTime = outData && outData[0] && outData[0][0] ? outData[0][0] : null;
        
        // Fix: If in is empty but out has time, swap them
        if (!inTime && outTime && outTime !== 'Off') {
          inTime = outTime;
          outTime = null;
        }
        
        attendanceData.push({
          name: employee.name,
          date: date,
          inTime: inTime,
          outTime: outTime,
          isPresent: !!(inTime || outTime),
          row: employee.row
        });
      }
      
      return {
        date: date,
        totalEmployees: employees.length,
        presentEmployees: attendanceData.filter(a => a.isPresent).length,
        absentEmployees: attendanceData.filter(a => !a.isPresent).length,
        attendance: attendanceData
      };
      
    } catch (error) {
      console.error(`❌ Error getting attendance for date ${date}:`, error.message);
      throw error;
    }
  }
}

module.exports = new AttendanceDetector(); 