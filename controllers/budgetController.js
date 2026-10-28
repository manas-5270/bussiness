const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Get all budgets with dynamic spent, remaining, and utilization metrics
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const { period, department, category } = req.query;

    const query = { businessId };
    if (period && period !== 'All') query.period = period;
    if (department && department !== 'All') query.department = department;
    if (category && category !== 'All') query.category = category;

    const budgets = await Budget.find(query).sort({ period: -1, department: 1, category: 1 });

    // Calculate actual expenses for each budget
    const enrichedBudgets = await Promise.all(
      budgets.map(async (b) => {
        const [year, month] = b.period.split('-').map(Number);
        let start, end;

        if (year && month) {
          start = new Date(year, month - 1, 1);
          end = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
          // If quarterly e.g. Q4-2026
          start = new Date(2026, 0, 1);
          end = new Date(2026, 11, 31, 23, 59, 59, 999);
        }

        const spendAgg = await Transaction.aggregate([
          {
            $match: {
              businessId,
              type: 'expense',
              department: b.department,
              category: b.category,
              date: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              spent: { $sum: '$amount' },
              txCount: { $sum: 1 },
            },
          },
        ]);

        const spent = spendAgg[0] ? spendAgg[0].spent : 0;
        const txCount = spendAgg[0] ? spendAgg[0].txCount : 0;
        const remaining = Math.max(0, b.allocatedAmount - spent);
        const overspent = spent > b.allocatedAmount ? spent - b.allocatedAmount : 0;
        const utilization = b.allocatedAmount > 0
          ? Number(((spent / b.allocatedAmount) * 100).toFixed(1))
          : 0;

        let status = 'safe'; // green
        if (utilization >= 100) status = 'exceeded'; // red
        else if (utilization >= 90) status = 'critical'; // orange/amber
        else if (utilization >= 80) status = 'warning'; // yellow

        return {
          _id: b._id,
          department: b.department,
          category: b.category,
          allocatedAmount: b.allocatedAmount,
          spent,
          remaining,
          overspent,
          utilization,
          status,
          period: b.period,
          periodType: b.periodType,
          notes: b.notes,
          txCount,
          createdAt: b.createdAt,
        };
      })
    );

    // Compute high-level totals
    const totalAllocated = enrichedBudgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalSpent = enrichedBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = Math.max(0, totalAllocated - totalSpent);
    const overallUtilization = totalAllocated > 0
      ? Number(((totalSpent / totalAllocated) * 100).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalAllocated,
        totalSpent,
        totalRemaining,
        overallUtilization,
        count: enrichedBudgets.length,
      },
      budgets: enrichedBudgets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new budget allocation
// @route   POST /api/budgets
// @access  Private
exports.createBudget = async (req, res, next) => {
  try {
    const { department, category, allocatedAmount, period, periodType, notes } = req.body;

    if (!department || !category || allocatedAmount === undefined || !period) {
      return res.status(400).json({
        success: false,
        message: 'Please provide department, category, allocatedAmount, and period.',
      });
    }

    if (Number(allocatedAmount) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Allocated budget amount cannot be negative.',
      });
    }

    // Check duplicate
    const existing = await Budget.findOne({
      businessId: req.businessId,
      department,
      category,
      period,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A budget allocation already exists for ${category} in ${department} for period ${period}. Please edit the existing budget.`,
      });
    }

    const budget = await Budget.create({
      businessId: req.businessId,
      department,
      category,
      allocatedAmount: Number(allocatedAmount),
      period,
      periodType: periodType || 'monthly',
      notes: notes || '',
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Budget allocated successfully.',
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing budget
// @route   PUT /api/budgets/:id
// @access  Private
exports.updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found.' });
    }

    const { allocatedAmount, department, category, period, periodType, notes } = req.body;

    if (allocatedAmount !== undefined) {
      if (Number(allocatedAmount) < 0) {
        return res.status(400).json({ success: false, message: 'Budget amount cannot be negative.' });
      }
      budget.allocatedAmount = Number(allocatedAmount);
    }
    if (department) budget.department = department;
    if (category) budget.category = category;
    if (period) budget.period = period;
    if (periodType) budget.periodType = periodType;
    if (notes !== undefined) budget.notes = notes;

    await budget.save();

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully.',
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get planned vs actual comparison across periods
// @route   GET /api/budgets/comparison
// @access  Private
exports.getBudgetComparison = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const { period } = req.query;

    const now = new Date();
    const activePeriod = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = activePeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const budgets = await Budget.find({ businessId, period: activePeriod });

    const expenses = await Transaction.aggregate([
      {
        $match: {
          businessId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$department',
          actualSpent: { $sum: '$amount' },
        },
      },
    ]);

    const actualMap = {};
    expenses.forEach((e) => {
      actualMap[e._id] = e.actualSpent;
    });

    // Group budgets by department
    const deptBudgets = {};
    budgets.forEach((b) => {
      deptBudgets[b.department] = (deptBudgets[b.department] || 0) + b.allocatedAmount;
    });

    const allDepts = Array.from(new Set([...Object.keys(deptBudgets), ...Object.keys(actualMap)]));
    const comparison = allDepts.map((dept) => {
      const planned = deptBudgets[dept] || 0;
      const actual = actualMap[dept] || 0;
      const variance = planned - actual;
      const variancePct = planned > 0 ? Number((((actual - planned) / planned) * 100).toFixed(1)) : 0;

      return {
        department: dept,
        planned,
        actual,
        variance, // positive = under budget, negative = over budget
        variancePct,
        isOverBudget: actual > planned,
      };
    });

    res.status(200).json({
      success: true,
      period: activePeriod,
      comparison,
    });
  } catch (error) {
    next(error);
  }
};
