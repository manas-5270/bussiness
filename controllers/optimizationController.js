const Recommendation = require('../models/Recommendation');
const Budget = require('../models/Budget');
const OptimizationEngine = require('../services/optimizationEngine');

// @desc    Get all optimization recommendations for business
// @route   GET /api/optimization/recommendations
// @access  Private
exports.getRecommendations = async (req, res, next) => {
  try {
    const { status, priority, department } = req.query;

    const query = { businessId: req.businessId };
    if (status && status !== 'All') query.status = status;
    if (priority && priority !== 'All') query.priority = priority;
    if (department && department !== 'All') query.department = department;

    const recommendations = await Recommendation.find(query).sort({
      status: 1, // 'Pending' first
      priority: 1,
      estimatedSavings: -1,
      createdAt: -1,
    });

    // Summary metrics
    const pendingRecs = recommendations.filter((r) => r.status === 'Pending');
    const totalPotentialSavings = pendingRecs.reduce((sum, r) => sum + r.estimatedSavings, 0);
    const acceptedRecs = recommendations.filter((r) => r.status === 'Accepted');
    const totalRealizedSavings = acceptedRecs.reduce((sum, r) => sum + r.estimatedSavings, 0);

    const counts = {
      total: recommendations.length,
      pending: pendingRecs.length,
      accepted: acceptedRecs.length,
      dismissed: recommendations.filter((r) => r.status === 'Dismissed').length,
      highPriority: pendingRecs.filter((r) => r.priority === 'High').length,
      mediumPriority: pendingRecs.filter((r) => r.priority === 'Medium').length,
      lowPriority: pendingRecs.filter((r) => r.priority === 'Low').length,
    };

    res.status(200).json({
      success: true,
      summary: {
        totalPotentialSavings,
        totalRealizedSavings,
        counts,
      },
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger optimization engine analysis & generate fresh recommendations
// @route   POST /api/optimization/generate
// @access  Private
exports.generateRecommendations = async (req, res, next) => {
  try {
    const { period } = req.body;
    const recommendations = await OptimizationEngine.analyzeAndGenerate(req.businessId, period);

    res.status(200).json({
      success: true,
      message: `Optimization engine completed analysis. Generated ${recommendations.length} recommendations.`,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update recommendation status (Accept, Dismiss, Mark Reviewed)
// @route   PATCH /api/optimization/recommendations/:id
// @access  Private
exports.updateRecommendationStatus = async (req, res, next) => {
  try {
    const { status, applyToBudget } = req.body;

    if (!['Pending', 'Accepted', 'Dismissed', 'Reviewed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided.' });
    }

    const rec = await Recommendation.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!rec) {
      return res.status(404).json({ success: false, message: 'Recommendation not found.' });
    }

    rec.status = status;
    rec.actionTakenAt = new Date();
    rec.actionTakenBy = req.user.id;
    await rec.save();

    // If accepted and user chose to apply the suggested allocation to the active budget
    if (status === 'Accepted' && applyToBudget && rec.suggestedAllocation > 0) {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const budget = await Budget.findOne({
        businessId: req.businessId,
        department: rec.department,
        category: rec.category,
        period: currentPeriod,
      });

      if (budget) {
        budget.allocatedAmount = rec.suggestedAllocation;
        budget.notes = `${budget.notes ? budget.notes + ' | ' : ''}Auto-adjusted via Optimization Recommendation #${rec._id.toString().slice(-4)}`;
        await budget.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Recommendation marked as ${status}.`,
      recommendation: rec,
    });
  } catch (error) {
    next(error);
  }
};
