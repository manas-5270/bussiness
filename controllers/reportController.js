const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Department = require('../models/Department');

// @desc    Get executive report summary metrics across date range
// @route   GET /api/reports/summary
// @access  Private
exports.getReportSummary = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const { startDate, endDate, department } = req.query;

    const txMatch = { businessId };
    if (department && department !== 'All') {
      txMatch.department = department;
    }

    if (startDate || endDate) {
      txMatch.date = {};
      if (startDate) txMatch.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        txMatch.date.$lte = end;
      }
    } else {
      // Default: current calendar quarter
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      txMatch.date = { $gte: quarterStart };
    }

    // Totals by type
    const totals = await Transaction.aggregate([
      { $match: txMatch },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avg: { $avg: '$amount' },
        },
      },
    ]);

    let totalExpense = 0;
    let totalIncome = 0;
    let expenseTxCount = 0;
    let incomeTxCount = 0;

    totals.forEach((t) => {
      if (t._id === 'expense') {
        totalExpense = t.total;
        expenseTxCount = t.count;
      }
      if (t._id === 'income') {
        totalIncome = t.total;
        incomeTxCount = t.count;
      }
    });

    // Net Savings & Savings Margin
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Number(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

    // Category summary
    const categorySummary = await Transaction.aggregate([
      { $match: { ...txMatch, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Department performance summary
    const departmentSummary = await Transaction.aggregate([
      { $match: { ...txMatch, type: 'expense' } },
      {
        $group: {
          _id: '$department',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Payment method distribution
    const paymentMethodSummary = await Transaction.aggregate([
      { $match: txMatch },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      summary: {
        totalExpense,
        totalIncome,
        netSavings,
        savingsRate,
        expenseTxCount,
        incomeTxCount,
        totalTransactions: expenseTxCount + incomeTxCount,
      },
      categorySummary: categorySummary.map((c) => ({
        category: c._id,
        total: c.total,
        count: c.count,
        percentage: totalExpense > 0 ? Number(((c.total / totalExpense) * 100).toFixed(1)) : 0,
      })),
      departmentSummary: departmentSummary.map((d) => ({
        department: d._id,
        total: d.total,
        count: d.count,
        percentage: totalExpense > 0 ? Number(((d.total / totalExpense) * 100).toFixed(1)) : 0,
      })),
      paymentMethodSummary: paymentMethodSummary.map((p) => ({
        method: p._id,
        total: p.total,
        count: p.count,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed expenses data for report table & export
// @route   GET /api/reports/expenses
// @access  Private
exports.getExpensesReport = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const { startDate, endDate, department, category, type } = req.query;

    const query = { businessId };
    if (department && department !== 'All') query.department = department;
    if (category && category !== 'All') query.category = category;
    if (type && type !== 'All') query.type = type;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};
