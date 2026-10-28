const express = require('express');
const router = express.Router();
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetComparison,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/comparison', getBudgetComparison);

router.route('/')
  .get(getBudgets)
  .post(authorize('Admin', 'Finance Manager'), createBudget);

router.route('/:id')
  .put(authorize('Admin', 'Finance Manager'), updateBudget)
  .delete(authorize('Admin'), deleteBudget);

module.exports = router;
