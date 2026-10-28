const express = require('express');
const router = express.Router();
const { getSummary, getExpenseTrends, getCategoryBreakdown } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getSummary);
router.get('/expense-trends', getExpenseTrends);
router.get('/category-breakdown', getCategoryBreakdown);

module.exports = router;
