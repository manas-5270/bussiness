const express = require('express');
const router = express.Router();
const {
  getRecommendations,
  generateRecommendations,
  updateRecommendationStatus,
} = require('../controllers/optimizationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/recommendations', getRecommendations);
router.post('/generate', authorize('Admin', 'Finance Manager'), generateRecommendations);
router.patch('/recommendations/:id', authorize('Admin', 'Finance Manager'), updateRecommendationStatus);

module.exports = router;
