const express = require('express');
const { restrictTo } = require('../../middleware/auth');
const {
  generateLoungeReport,
  generateRoomsReport,
  generateTrainingReport,
  generateCenterReport,
  getAllReports,
  getReportById,
  deleteReport,
  getAuditLogs,
  getReportSummary,
  getAllReportsExcel
} = require('../../controllers/reportController');

const { generateMonthlyReport } = require('../../controllers/monthlyReportController');

const router = express.Router();

router.use(restrictTo('admin'));

// Report generation
router.post('/generate/lounge', generateLoungeReport);
router.post('/generate/rooms', generateRoomsReport);
router.post('/generate/training', generateTrainingReport);
router.post('/generate/center', generateCenterReport);
router.post('/generate/monthly', generateMonthlyReport);

router.get('/summary', getReportSummary);
router.get('/', getAllReports);
router.get('/export', getAllReportsExcel);
router.get('/audit-logs', getAuditLogs);
router.get('/:id', getReportById);
router.delete('/:id', deleteReport);

module.exports = router;