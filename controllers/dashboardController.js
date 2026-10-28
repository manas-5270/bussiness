const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Recommendation = require('../models/Recommendation');
const Department = require('../models/Department');

// @desc    Get comprehensive dashboard summary metrics
// @route   GET /api/dashboard/summary
// @access  Private
exports.getSummary = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const { period, department } = req.query;

    // Default period: current Year-Month (e.g. 2026-10)
    let currentPeriod = period;
    if (!currentPeriod || currentPeriod === 'all') {
      const now = new Date();
      currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const [year, month] = currentPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Previous month for MoM comparison
    const prevStartDate = new Date(year, month - 2, 1);
    const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);

    // Build base filter
    const txMatch = { businessId, date: { $gte: startDate, $lte: endDate } };
    const prevTxMatch = { businessId, date: { $gte: prevStartDate, $lte: prevEndDate } };
    const budgetMatch = { businessId, period: currentPeriod };

    if (department && department !== 'All') {
      txMatch.department = department;
      prevTxMatch.department = department;
      budgetMatch.department = department;
    }

    // 1. Calculate Total Budget
    const budgets = await Budget.find(budgetMatch);
    const totalBudget = budgets.reduce((acc, curr) => acc + (curr.allocatedAmount || 0), 0);

    // 2. Calculate Total Expenses & Incomes for Current Month
    const currentTxTotals = await Transaction.aggregate([
      { $match: txMatch },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalExpenses = 0;
    let totalIncome = 0;
    currentTxTotals.forEach((item) => {
      if (item._id === 'expense') totalExpenses = item.total;
      if (item._id === 'income') totalIncome = item.total;
    });

    // 3. Calculate Previous Month Expenses for MoM
    const prevTxTotals = await Transaction.aggregate([
      { $match: { ...prevTxMatch, type: 'expense' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    const prevExpenses = prevTxTotals[0] ? prevTxTotals[0].total : 0;
    const momChangePercentage = prevExpenses > 0
      ? Number((((totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1))
      : 0;

    // Remaining Budget & Utilization
    const remainingBudget = Math.max(0, totalBudget - totalExpenses);
    const budgetUtilization = totalBudget > 0
      ? Number(((totalExpenses / totalBudget) * 100).toFixed(1))
      : 0;
    const monthlySavings = totalIncome > 0
      ? Math.max(0, totalIncome - totalExpenses)
      : Math.max(0, totalBudget - totalExpenses);

    // 4. Overspending Alerts & Department Utilization
    const deptSpendMap = await Transaction.aggregate([
      { $match: { ...txMatch, type: 'expense' } },
      {
        $group: {
          _id: '$department',
          spent: { $sum: '$amount' },
        },
      },
    ]);

    const deptSpendLookup = {};
    deptSpendMap.forEach((item) => {
      deptSpendLookup[item._id] = item.spent;
    });

    // Aggregate budgets by department
    const deptBudgetMap = {};
    budgets.forEach((b) => {
      deptBudgetMap[b.department] = (deptBudgetMap[b.department] || 0) + b.allocatedAmount;
    });

    const allDepartments = await Department.find({ businessId });
    const departmentStats = allDepartments.map((d) => {
      const allocated = deptBudgetMap[d.name] || 0;
      const spent = deptSpendLookup[d.name] || 0;
      const remaining = Math.max(0, allocated - spent);
      const utilization = allocated > 0 ? Number(((spent / allocated) * 100).toFixed(1)) : 0;
      let status = 'normal';
      if (utilization >= 100) status = 'critical';
      else if (utilization >= 90) status = 'danger';
      else if (utilization >= 80) status = 'warning';

      return {
        id: d._id,
        name: d.name,
        color: d.color,
        allocated,
        spent,
        remaining,
        utilization,
        status,
      };
    });

    // Overspending alerts list
    const alerts = [];
    departmentStats.forEach((ds) => {
      if (ds.status === 'critical') {
        alerts.push({
          id: `alert-${ds.name}-crit`,
          level: 'critical',
          department: ds.name,
          message: `${ds.name} department has exceeded its monthly budget by ₹${(ds.spent - ds.allocated).toLocaleString('en-IN')} (${ds.utilization}%)`,
        });
      } else if (ds.status === 'danger') {
        alerts.push({
          id: `alert-${ds.name}-dang`,
          level: 'danger',
          department: ds.name,
          message: `${ds.name} department reached ${ds.utilization}% of allocated budget. Approaching cap limit.`,
        });
      } else if (ds.status === 'warning') {
        alerts.push({
          id: `alert-${ds.name}-warn`,
          level: 'warning',
          department: ds.name,
          message: `${ds.name} department has reached ${ds.utilization}% of its budget threshold.`,
        });
      }
    });

    // 5. Recent 6 transactions
    const recentTransactions = await Transaction.find({ businessId })
      .sort({ date: -1, createdAt: -1 })
      .limit(6);

    // 6. Top 5 spending categories
    const topCategories = await Transaction.aggregate([
      { $match: { ...txMatch, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);

    // 7. Active Recommendations teaser
    const topRecommendations = await Recommendation.find({ businessId, status: 'Pending' })
      .sort({ priority: 1, estimatedSavings: -1 })
      .limit(3);

    res.status(200).json({
      success: true,
      period: currentPeriod,
      summary: {
        totalBudget,
        totalExpenses,
        totalIncome,
        remainingBudget,
        monthlySavings,
        budgetUtilization,
        momChangePercentage,
        prevExpenses,
      },
      departmentStats,
      alerts,
      topCategories: topCategories.map((c) => ({
        category: c._id,
        amount: c.total,
        percentage: totalExpenses > 0 ? Number(((c.total / totalExpenses) * 100).toFixed(1)) : 0,
        count: c.count,
      })),
      recentTransactions,
      topRecommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get historical monthly spending trends (last 6 to 12 months)
// @route   GET /api/dashboard/expense-trends
// @access  Private
exports.getExpenseTrends = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const monthsBack = parseInt(req.query.months, 10) || 6;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const trends = await Transaction.aggregate([
      {
        $match: {
          businessId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Fetch budgets for those months
    const allBudgets = await Budget.find({ businessId });

    // Format into chronological array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeline = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const periodKey = `${y}-${String(m).padStart(2, '0')}`;
      const label = `${monthNames[m - 1]} ${y.toString().slice(-2)}`;

      const expenseMatch = trends.find((t) => t._id.year === y && t._id.month === m && t._id.type === 'expense');
      const incomeMatch = trends.find((t) => t._id.year === y && t._id.month === m && t._id.type === 'income');

      // Sum budget for this period
      const periodBudget = allBudgets
        .filter((b) => b.period === periodKey)
        .reduce((sum, b) => sum + b.allocatedAmount, 0);

      const expenses = expenseMatch ? expenseMatch.total : 0;
      const income = incomeMatch ? incomeMatch.total : 0;
      const savings = Math.max(0, (periodBudget || income) - expenses);

      timeline.push({
        period: periodKey,
        label,
        expenses,
        income,
        budget: periodBudget > 0 ? periodBudget : Math.round(expenses * 1.15),
        savings,
      });
    }

    res.status(200).json({
      success: true,
      timeline,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category-wise expense breakdown
// @route   GET /api/dashboard/category-breakdown
// @access  Private
exports.getCategoryBreakdown = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const { period, department } = req.query;

    const now = new Date();
    const currentPeriod = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = currentPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const matchQuery = {
      businessId,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
    };

    if (department && department !== 'All') {
      matchQuery.department = department;
    }

    const categories = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const total = categories.reduce((sum, c) => sum + c.amount, 0);

    const breakdown = categories.map((c) => ({
      category: c._id,
      amount: c.amount,
      count: c.count,
      percentage: total > 0 ? Number(((c.amount / total) * 100).toFixed(1)) : 0,
    }));

    res.status(200).json({
      success: true,
      period: currentPeriod,
      total,
      breakdown,
    });
  } catch (error) {
    next(error);
  }
};
