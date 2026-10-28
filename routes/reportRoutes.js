const express = require('express');
const router = express.Router();
const { getReportSummary, getExpensesReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getReportSummary);
router.get('/expenses', getExpensesReport);

module.exports = router;
