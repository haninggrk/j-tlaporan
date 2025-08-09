const express = require('express');
const cors = require('cors');
const reportService = require('./services/reportService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

/**
 * GET /api/report/today
 * Get today's daily report
 */
app.get('/api/report/today', async (req, res) => {
  try {
    const today = new Date();
    const report = await reportService.generateDailyReport(today);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating today\'s report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate today\'s report',
      message: error.message
    });
  }
});

/**
 * GET /api/report/:date
 * Get daily report for specific date
 * @param {string} date - Date in YYYY-MM-DD format
 */
app.get('/api/report/:date', async (req, res) => {
  try {
    const dateParam = req.params.date;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: 'Please use YYYY-MM-DD format (e.g., 2025-08-04)'
      });
    }
    
    const targetDate = new Date(dateParam);
    
    // Check if date is valid
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date',
        message: 'Please provide a valid date'
      });
    }
    
    const report = await reportService.generateDailyReport(targetDate);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating report for date:', req.params.date, error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'J&T Daily Report API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 * Root endpoint with API documentation
 */
app.get('/', (req, res) => {
  res.json({
    message: 'J&T Daily Report API',
    version: '1.0.0',
    endpoints: {
      'GET /api/health': 'Health check',
      'GET /api/report/today': 'Get today\'s daily report',
      'GET /api/report/:date': 'Get daily report for specific date (YYYY-MM-DD format)'
    },
    examples: {
      today: '/api/report/today',
      specificDate: '/api/report/2025-08-04'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.path} does not exist`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 J&T Daily Report API is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Today's report: http://localhost:${PORT}/api/report/today`);
  console.log(`📅 Specific date: http://localhost:${PORT}/api/report/2025-08-04`);
});

module.exports = app;