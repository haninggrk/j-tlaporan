const sheetManager = require('./sheetManager');
const sheetDetector = require('../utils/sheetDetector');

class ReportService {
  constructor() {
    this.attendanceDetector = require('./attendanceDetector');
  }

  /**
   * Generate daily report for a specific date
   * @param {Date} targetDate - Date to generate report for
   * @returns {Promise<Object>} Report data
   */
  async generateDailyReport(targetDate = new Date()) {
    try {
      // Get target sheet based on input date
      const targetSheet = sheetDetector.getSheetNameForDate(targetDate);
      
      const todayDay = targetDate.getDate().toString().padStart(2, '0');
      
      // Get attendance data
      let attendanceData = [];
      try {
        const attendanceResult = await this.attendanceDetector.getTodayAttendance(targetSheet, targetDate.getDate());
        
        if (attendanceResult.attendance && attendanceResult.attendance.length > 0) {
          attendanceResult.attendance.forEach((employee) => {
            if (employee.isPresent) {
              attendanceData.push({
                name: employee.name,
                inTime: employee.inTime || '-',
                outTime: employee.outTime || '-'
              });
            }
          });
        }
      } catch (error) {
        console.log('No attendance data available for this date');
      }

      // Get CARGO data
      const cargoData = await this.getCargoData(targetSheet, targetDate);
      
      // Get EXPRESS data
      const expressData = await this.getExpressData(targetSheet, targetDate);
      
      // Get PENGELUARAN data
      const pengeluaranData = await this.getPengeluaranData(targetSheet, targetDate);

      return {
        date: targetDate.toISOString().split('T')[0],
        dateDisplay: targetDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        sheet: targetSheet,
        attendance: attendanceData,
        cargo: cargoData,
        express: expressData,
        pengeluaran: pengeluaranData
      };
      
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  }

  /**
   * Get CARGO data for a specific date
   */
  async getCargoData(targetSheet, targetDate) {
    try {
      // Find where "PENGELUARAN" starts to determine range
      const searchData = await sheetManager.getSheetData(targetSheet, 'B13:B300');
      let endRow = 300;
      
      for (let i = 0; i < searchData.length; i++) {
        const cellValue = searchData[i][0];
        if (cellValue && cellValue.toString().toUpperCase().includes('PENGELUARAN')) {
          endRow = 13 + i - 1;
          break;
        }
      }
      
      const cargoData = await sheetManager.getSheetData(targetSheet, `A13:R${endRow}`);
      const todayDay = targetDate.getDate().toString().padStart(2, '0');
      
      let currentDate = null;
      const todayCargoRows = [];
      
      cargoData.forEach((row, index) => {
        const dateValue = row[1]; // Column B (date)
        const awb = row[3]; // Column D (AWB)
        const kg = row[7]; // Column H (Kg)
        const sistem = row[10]; // Column K (Sistem)
        const tunai = row[8]; // Column I (Tunai)
        const tfMandiriK = row[10]; // Column K (TF Mandiri - bagian 1)
        const tfMandiriL = row[11]; // Column L (TF Mandiri - bagian 2)
        const tfBca = row[12]; // Column M (TF BCA)
        const dfod = row[14]; // Column N (DFOD)
        const packing = row[15]; // Column O (Packing)

        // Check if this row has a date
        if (dateValue && dateValue.toString && dateValue.toString().trim() !== '') {
          if (dateValue === todayDay) {
            currentDate = todayDay;
          } else {
            currentDate = null;
          }
        }

        // If we're in today's date section, collect the row
        if (currentDate === todayDay) {
          todayCargoRows.push({ row, awb, kg, sistem, tunai, tfMandiriK, tfMandiriL, tfBca, dfod, packing });
        }
      });

      // Calculate totals
      let totalAWB = 0;
      let totalKg = 0;
      let totalOnlineKg = 0;
      let onlineAWBs = [];
      let totalTunai = 0;
      let totalTfMandiri = 0;
      let totalTfBca = 0;
      let totalDfod = 0;
      let totalPacking = 0;

      todayCargoRows.forEach((entry) => {
        const { awb, kg, sistem, tunai, tfMandiriK, tfMandiriL, tfBca, dfod, packing } = entry;
        
        if (awb && awb.toString().trim() !== '' && awb.toString().toLowerCase() !== 'total') {
          const kgValue = kg ? parseFloat(kg.toString().replace(/[^\d.-]/g, '')) : 0;
          const tunaiValue = tunai ? parseFloat(tunai.toString().replace(/[^\d.-]/g, '')) : 0;
          const tfMandiriKValue = tfMandiriK ? parseFloat(tfMandiriK.toString().replace(/[^\d.-]/g, '')) : 0;
          const tfMandiriLValue = tfMandiriL ? parseFloat(tfMandiriL.toString().replace(/[^\d.-]/g, '')) : 0;
          const tfBcaValue = tfBca ? parseFloat(tfBca.toString().replace(/[^\d.-]/g, '')) : 0;
          const dfodValue = dfod ? parseFloat(dfod.toString().replace(/[^\d.-]/g, '')) : 0;
          const packingValue = packing ? parseFloat(packing.toString().replace(/[^\d.-]/g, '')) : 0;
          
          totalTunai += tunaiValue;
          totalTfMandiri += tfMandiriKValue + tfMandiriLValue;
          totalTfBca += tfBcaValue;
          totalDfod += dfodValue;
          totalPacking += packingValue;
          
          // Check if it's online AWB (TikTok/Shopee/Api)
          const awbString = awb.toString().toLowerCase();
          if (awbString.includes('tiktok') || awbString.includes('shopee') || awbString.includes('api')) {
            onlineAWBs.push(awb.toString());
            totalOnlineKg += kgValue;
          } else if (awb.toString().match(/^\d{10,}$/)) {
            // Only count numeric AWB as regular AWB
            totalAWB++;
            totalKg += kgValue;
          }
        }
      });

      return {
        totalAWB,
        totalAWBOnline: onlineAWBs.length > 0 ? onlineAWBs.join(' ') : 'TBD',
        totalTonase: totalKg,
        totalTonaseOnline: totalOnlineKg,
        totalTunai,
        totalTfMandiri,
        totalTfBca,
        totalDfod,
        totalPacking
      };
      
    } catch (error) {
      console.error('Error getting cargo data:', error);
      return {
        totalAWB: 0,
        totalAWBOnline: 'TBD',
        totalTonase: 0,
        totalTonaseOnline: 0,
        totalTunai: 0,
        totalTfMandiri: 0,
        totalTfBca: 0,
        totalDfod: 0,
        totalPacking: 0
      };
    }
  }

  /**
   * Get EXPRESS data for a specific date
   */
  async getExpressData(targetSheet, targetDate) {
    try {
      // Find where "PENGELUARAN" starts to determine range
      const searchData = await sheetManager.getSheetData(targetSheet, 'B13:B300');
      let endRow = 300;
      
      for (let i = 0; i < searchData.length; i++) {
        const cellValue = searchData[i][0];
        if (cellValue && cellValue.toString().toUpperCase().includes('PENGELUARAN')) {
          endRow = 13 + i - 1;
          break;
        }
      }
      
      const expressData = await sheetManager.getSheetData(targetSheet, `AD9:AY${endRow}`);
      const todayDay = targetDate.getDate().toString().padStart(2, '0');
      
      let expressCurrentDate = null;
      const todayExpressRows = [];
      
      expressData.forEach((row, index) => {
        const dateValue = row[0]; // Column AD (date)
        const tunai = row[7]; // Column AK (Tunai)
        const mandiri = row[9]; // Column AM (Mandiri)
        const bca = row[11]; // Column AO (BCA)
        const packing = row[13]; // Column AQ (Packing)

        // Check if this row has a date
        if (dateValue && dateValue.toString && dateValue.toString().trim() !== '') {
          if (dateValue === todayDay) {
            expressCurrentDate = todayDay;
          } else {
            expressCurrentDate = null;
          }
        }

        // If we're in today's date section, collect rows with prices
        if (expressCurrentDate === todayDay) {
          // Check for "TOTAL" in ANY column of this row
          let hasTotal = false;
          for (let i = 0; i < row.length; i++) {
            const cellValue = row[i];
            if (cellValue && cellValue.toString().toLowerCase().includes('total')) {
              hasTotal = true;
              break;
            }
          }
          
          // Skip rows with "TOTAL" in any column
          if (hasTotal) {
            return;
          }
          
          if (tunai || mandiri || bca || packing) {
            todayExpressRows.push({ tunai, mandiri, bca, packing });
          }
        }
      });

      // Calculate EXPRESS totals
      let totalExpressAWB = todayExpressRows.length;
      let totalExpressTunai = 0;
      let totalExpressMandiri = 0;
      let totalExpressBca = 0;
      let totalExpressPacking = 0;

      todayExpressRows.forEach((entry) => {
        const { tunai, mandiri, bca, packing } = entry;

        const tunaiValue = tunai ? parseFloat(tunai.toString().replace(/[^\d.-]/g, '')) : 0;
        const mandiriValue = mandiri ? parseFloat(mandiri.toString().replace(/[^\d.-]/g, '')) : 0;
        const bcaValue = bca ? parseFloat(bca.toString().replace(/[^\d.-]/g, '')) : 0;
        const packingValue = packing ? parseFloat(packing.toString().replace(/[^\d.-]/g, '')) : 0;

        totalExpressTunai += tunaiValue;
        totalExpressMandiri += mandiriValue;
        totalExpressBca += bcaValue;
        totalExpressPacking += packingValue;
      });

      return {
        totalAWBExpress: totalExpressAWB,
        totalTunaiExpress: totalExpressTunai,
        totalTfMandiriExpress: totalExpressMandiri,
        totalTfBcaExpress: totalExpressBca,
        totalPackingExpress: totalExpressPacking
      };
      
    } catch (error) {
      console.error('Error getting express data:', error);
      return {
        totalAWBExpress: 0,
        totalTunaiExpress: 0,
        totalTfMandiriExpress: 0,
        totalTfBcaExpress: 0,
        totalPackingExpress: 0
      };
    }
  }

  /**
   * Get PENGELUARAN data for a specific date
   */
  async getPengeluaranData(targetSheet, targetDate) {
    try {
      const pengeluaranData = await sheetManager.getSheetData(targetSheet, 'B226:S248');
      const targetDay = targetDate.getDate().toString(); // Without padding (e.g., "4")
      const targetDayPadded = targetDate.getDate().toString().padStart(2, '0'); // With padding (e.g., "04")
      
      let totalPengeluaran = 0;
      let pengeluaranWithoutPrice = [];
      
      pengeluaranData.forEach((row, index) => {
        const dateValue = row[0]; // Column B (date) - FIXED!
        const description = row[2]; // Column D (keterangan)
        const amount = row[11]; // Column M (jumlah)
        
        // Check if this row matches today's date (try both padded and unpadded)
        if (dateValue && (dateValue.toString() === targetDay || dateValue.toString() === targetDayPadded)) {
          if (description && description.toString().trim() !== '') {
            if (amount && amount.toString().trim() !== '') {
              // Has price
              const amountValue = parseFloat(amount.toString().replace(/[^\d.-]/g, ''));
              totalPengeluaran += amountValue;
            } else {
              // No price
              pengeluaranWithoutPrice.push(description.toString().trim());
            }
          }
        }
      });

      return {
        totalPengeluaran,
        itemsWithoutPrice: pengeluaranWithoutPrice
      };
      
    } catch (error) {
      console.error('Error getting pengeluaran data:', error);
      return {
        totalPengeluaran: 0,
        itemsWithoutPrice: []
      };
    }
  }
}

module.exports = new ReportService();