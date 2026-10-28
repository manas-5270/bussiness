const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportCSV,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/export/csv', exportCSV);

router.route('/')
  .get(getTransactions)
  .post(upload.single('receipt'), createTransaction);

router.route('/:id')
  .get(getTransactionById)
  .put(upload.single('receipt'), updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
