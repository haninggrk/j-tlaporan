const sheetManager = require('./services/sheetManager');
const sheetDetector = require('./utils/sheetDetector');

async function generateDailyReport() {
  try {
    // Get date from command line argument or use today's date
    const args = process.argv.slice(2);
    let targetDate;
    
    if (args.length > 0) {
      // Parse date from argument (format: DD/MM/YYYY or DD-MM-YYYY)
      const dateArg = args[0];
      const dateMatch = dateArg.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        console.log('❌ Format tanggal salah! Gunakan format: DD/MM/YYYY atau DD-MM-YYYY');
        console.log('Contoh: node daily-report.js 03/08/2025');
        process.exit(1);
      }
    } else {
      targetDate = new Date();
    }
    
    const today = targetDate;
    const todayDay = today.getDate().toString().padStart(2, '0');
    const todayMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const todayYear = today.getFullYear();
    
    console.log(`Laporan Harian J&T`);
    console.log(`${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
    console.log('');

    // Get target sheet based on input date
    const targetSheet = sheetDetector.getSheetNameForDate(today);
    
    if (!targetSheet) {
      console.log('❌ No suitable sheet found');
      return;
    }

    // Read attendance data using AttendanceDetector
    const attendanceDetector = require('./services/attendanceDetector');
    
    console.log('Absensi:');
    
    try {
      const attendanceResult = await attendanceDetector.getTodayAttendance(targetSheet, today.getDate());
      
      if (attendanceResult.attendance && attendanceResult.attendance.length > 0) {
        let hasAttendance = false;
        
        attendanceResult.attendance.forEach((employee, index) => {
          if (employee.isPresent) {
            const inTime = employee.inTime || '-';
            const outTime = employee.outTime || '-';
            console.log(`${index + 1}. ${employee.name} (In: ${inTime}, Out: ${outTime})`);
            hasAttendance = true;
          }
        });
        
        if (!hasAttendance) {
          console.log('Tidak ada data absensi untuk tanggal ini');
        }
      } else {
        console.log('Tidak ada data absensi untuk tanggal ini');
      }
    } catch (error) {
      console.log('Tidak ada data absensi untuk tanggal ini');
    }
    
    console.log('');

    // First, find where "PENGELUARAN" starts in column B
    const searchData = await sheetManager.getSheetData(targetSheet, 'B13:B300');
    let endRow = 200; // Default fallback
    
    for (let i = 0; i < searchData.length; i++) {
      const cellValue = searchData[i][0];
      if (cellValue && cellValue.toString().toUpperCase().includes('PENGELUARAN')) {
        endRow = 13 + i - 1; // Stop before the PENGELUARAN row
        break;
      }
    }
    
    console.log(`Reading cargo data from row 13 to ${endRow}`);
    
    // Read cargo data manually with continuation logic up to PENGELUARAN
    const cargoData = await sheetManager.getSheetData(targetSheet, `A13:R${endRow}`);
    
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
      const dfod = row[13]; // Column N (DFOD)
      const packing = row[14]; // Column O (Packing)
      
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
    
    // Calculate total AWB
    let totalAWB = 0;
    let totalPcs = 0;
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
      
      if (awb && awb.toString().trim() !== '') {
        const pcs = sistem ? parseFloat(sistem.toString().replace(/[^\d.-]/g, '')) : 0;
        const kgValue = kg ? parseFloat(kg.toString().replace(/[^\d.-]/g, '')) : 0;
        const tunaiValue = tunai ? parseFloat(tunai.toString().replace(/[^\d.-]/g, '')) : 0;
        const tfMandiriKValue = tfMandiriK ? parseFloat(tfMandiriK.toString().replace(/[^\d.-]/g, '')) : 0;
        const tfMandiriLValue = tfMandiriL ? parseFloat(tfMandiriL.toString().replace(/[^\d.-]/g, '')) : 0;
        const tfBcaValue = tfBca ? parseFloat(tfBca.toString().replace(/[^\d.-]/g, '')) : 0;
        const dfodValue = dfod ? parseFloat(dfod.toString().replace(/[^\d.-]/g, '')) : 0;
        const packingValue = packing ? parseFloat(packing.toString().replace(/[^\d.-]/g, '')) : 0;
        
        totalPcs += pcs;
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
          totalKg += kgValue; // Only add to total kg if it's NOT online
        }
      }
    });
    
    console.log('CARGO');
    console.log(`2.1 Total AWB: ${totalAWB} pcs`);
    console.log(`2.2 Total AWB Online: ${onlineAWBs.length > 0 ? onlineAWBs.join(' ') : 'TBD'}`);
    console.log(`2.3 Total Tonase: ${totalKg} kg`);
    console.log(`2.4 Total Tonase Online: ${totalOnlineKg} kg`);
    console.log(`2.5 Total Tunai: Rp ${totalTunai.toLocaleString()}`);
    console.log(`2.6 Total TF Mandiri: Rp ${totalTfMandiri.toLocaleString()}`);
    console.log(`2.7 Total TF BCA: Rp ${totalTfBca.toLocaleString()}`);
    console.log(`2.8 Total DFOD: Rp ${totalDfod.toLocaleString()}`);
        console.log(`2.9 Total Packing: Rp ${totalPacking.toLocaleString()}`);

    console.log('');
    console.log('EXPRESS');

    // Read EXPRESS data from AD9 to AY up to PENGELUARAN
    const expressData = await sheetManager.getSheetData(targetSheet, `AD9:AY${endRow}`);
    
    let expressCurrentDate = null;
    const todayExpressRows = [];
    
    expressData.forEach((row, index) => {
      const dateValue = row[0]; // Column AD (date)
      const awb = row[2]; // Column AF (AWB/Paket)
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
        // Count any row that has at least one payment value
        if (tunai || mandiri || bca || packing) {
          todayExpressRows.push({ row, awb, tunai, mandiri, bca, packing });
        }
      }
    });

    // Calculate EXPRESS totals
    let totalExpressAWB = todayExpressRows.length; // Each row with price = 1 AWB
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

    console.log(`3.1 Total AWB Express: ${totalExpressAWB} pcs`);
    console.log(`3.2 Total Tunai Express: Rp ${totalExpressTunai.toLocaleString()}`);
    console.log(`3.3 Total TF Mandiri Express: Rp ${totalExpressMandiri.toLocaleString()}`);
    console.log(`3.4 Total TF BCA Express: Rp ${totalExpressBca.toLocaleString()}`);
    console.log(`3.5 Total Packing Express: Rp ${totalExpressPacking.toLocaleString()}`);

    console.log('');
    console.log('PENGELUARAN / PEMBELIAN');

    // Read PENGELUARAN data - start from B226 and read a large range to catch all data
    const pengeluaranData = await sheetManager.getSheetData(targetSheet, 'B226:S400');
    
    let totalPengeluaran = 0;
    let pengeluaranWithoutPrice = [];
    
    pengeluaranData.forEach((row, index) => {
      const dateValue = row[1]; // Column C (date)
      const description = row[2]; // Column D (keterangan)
      const amount = row[11]; // Column M (jumlah)
      
      // Check if this row matches today's date (remove leading zero for comparison)
      const targetDay = today.getDate().toString(); // Without padding
      if (dateValue && dateValue.toString() === targetDay) {
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

    console.log(`4.1 Total: Rp ${totalPengeluaran.toLocaleString()}`);
    console.log('4.2 Pengeluaran Tanpa Harga:');
    if (pengeluaranWithoutPrice.length > 0) {
      pengeluaranWithoutPrice.forEach(item => {
        console.log(`- ${item}`);
      });
    } else {
      console.log('-');
    }

  } catch (error) {
    console.error('Error generating daily report:', error);
  }
}

generateDailyReport(); 