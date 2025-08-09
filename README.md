# J&T Daily Report API

Express API untuk menggenerate laporan harian J&T berdasarkan data Google Sheets.

## Features

- ✅ **Laporan Hari Ini**: GET endpoint untuk laporan hari ini
- ✅ **Laporan Tanggal Tertentu**: GET endpoint dengan parameter tanggal
- ✅ **Dynamic Sheet Detection**: Otomatis deteksi sheet berdasarkan bulan/tahun
- ✅ **Complete Report**: Absensi, Cargo, Express, dan Pengeluaran
- ✅ **Dynamic Employee Detection**: Otomatis scan semua karyawan
- ✅ **Error Handling**: Comprehensive error handling dan validasi

## API Endpoints

### 1. Health Check
```
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "J&T Daily Report API is running",
  "timestamp": "2025-08-09T09:05:39.545Z"
}
```

### 2. Today's Report
```
GET /api/report/today
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-08-09",
    "dateDisplay": "August 9, 2025",
    "sheet": "AUG25",
    "attendance": [
      {
        "name": "RAHMAD",
        "inTime": "9:00",
        "outTime": "-"
      },
      {
        "name": "DETA", 
        "inTime": "13:00",
        "outTime": "-"
      }
    ],
    "cargo": {
      "totalAWB": 0,
      "totalAWBOnline": "TBD",
      "totalTonase": 0,
      "totalTonaseOnline": 0,
      "totalTunai": 2208000,
      "totalTfMandiri": 2169500,
      "totalTfBca": 0,
      "totalDfod": 0,
      "totalPacking": 406000
    },
    "express": {
      "totalAWBExpress": 0,
      "totalTunaiExpress": 0,
      "totalTfMandiriExpress": 0,
      "totalTfBcaExpress": 0,
      "totalPackingExpress": 0
    },
    "pengeluaran": {
      "totalPengeluaran": 35000,
      "itemsWithoutPrice": []
    }
  }
}
```

### 3. Specific Date Report
```
GET /api/report/:date
```

**Parameters:**
- `date`: Date in YYYY-MM-DD format (e.g., 2025-08-04)

**Example:**
```
GET /api/report/2025-08-04
```

**Response:** Same format as today's report but for the specified date.

## Installation

1. Clone repository:
```bash
git clone https://github.com/haninggrk/j-tlaporan.git
cd j-tlaporan
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp env.example .env
```

4. Configure your Google Sheets credentials in `.env`:
```env
GOOGLE_SHEETS_ID=your_sheet_id
SERVICE_ACCOUNT_KEY_FILE=credentials/service-account-andy.json
```

5. Start the server:
```bash
npm start
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Generate Report via CLI
```bash
npm run report 04/08/2025
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_SHEETS_ID` | Google Sheets document ID | ✅ |
| `SERVICE_ACCOUNT_KEY_FILE` | Path to service account JSON file | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |

## Google Sheets Structure

API ini bekerja dengan struktur Google Sheets berikut:

### Sheet Naming Convention
- Format: `MMMYY` (e.g., AUG25, JUL25)
- Sistem otomatis deteksi sheet berdasarkan tanggal

### Data Sections

1. **ABSENSI** (Row 6-8, Columns B-BM)
   - Employee names di kolom B
   - Dates di row 4
   - In/Out times di kolom alternating

2. **CARGO** (Row 13 - before PENGELUARAN)
   - Date di kolom B
   - AWB di kolom D  
   - Kg di kolom H
   - Payment info di kolom I-O

3. **EXPRESS** (AD9 - AY + dynamic range)
   - Date di kolom AD
   - Payment info di kolom AK, AM, AO, AQ

4. **PENGELUARAN** (B226 - S + dynamic range)
   - Date di kolom C
   - Description di kolom D
   - Amount di kolom M

## Error Handling

API ini memiliki comprehensive error handling:

- **400 Bad Request**: Invalid date format
- **500 Internal Server Error**: Google Sheets API errors
- **404 Not Found**: Invalid endpoints

## Response Format

Semua responses menggunakan format berikut:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Google Sheets API** - Data source
- **googleapis** - Google API client

## License

MIT License

## Author

Andy - J&T Daily Report Automation