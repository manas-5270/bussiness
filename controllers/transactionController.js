const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');

// @desc    Get all transactions with search, filters, sorting, and pagination
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const {
      search,
      category,
      department,
      type,
      paymentMethod,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = { businessId };

    // Search by title, description or vendor
    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { vendor: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Filters
    if (category && category !== 'All') {
      query.category = category;
    }
    if (department && department !== 'All') {
      query.department = department;
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (paymentMethod && paymentMethod !== 'All') {
      query.paymentMethod = paymentMethod;
    }

    // Date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Compute summary of matched transactions
    const totalAmount = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let totalExpense = 0;
    let totalIncome = 0;
    totalAmount.forEach((item) => {
      if (item._id === 'expense') totalExpense = item.total;
      if (item._id === 'income') totalIncome = item.total;
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      summary: {
        totalExpense,
        totalIncome,
        netCashflow: totalIncome - totalExpense,
      },
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res, next) => {
  try {
    const {
      title,
      amount,
      type = 'expense',
      category,
      department,
      date,
      paymentMethod,
      description,
      vendor,
      isRecurring,
    } = req.body;

    if (!title || !amount || !category || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, amount, category, and department.',
      });
    }

    let receiptUrl = '';
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.receiptUrl) {
      receiptUrl = req.body.receiptUrl;
    }

    const transaction = await Transaction.create({
      businessId: req.businessId,
      title: title.trim(),
      amount: Number(amount),
      type,
      category,
      department,
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'Bank Transfer',
      description: description ? description.trim() : '',
      vendor: vendor ? vendor.trim() : '',
      receiptUrl,
      isRecurring: Boolean(isRecurring),
      createdBy: req.user.id,
    });

    // Check if this expense pushed department/category near or over budget limit
    if (type === 'expense') {
      const txDate = new Date(transaction.date);
      const period = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

      const budget = await Budget.findOne({
        businessId: req.businessId,
        department,
        category,
        period,
      });

      if (budget) {
        // Calculate total spend in this budget
        const start = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
        const end = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const agg = await Transaction.aggregate([
          {
            $match: {
              businessId: new mongoose.Types.ObjectId(req.businessId),
              type: 'expense',
              department,
              category,
              date: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const totalSpent = agg[0] ? agg[0].total : 0;
        const utilization = (totalSpent / budget.allocatedAmount) * 100;

        if (utilization >= 100) {
          await Notification.create({
            businessId: req.businessId,
            title: `Budget Exceeded: ${category} (${department})`,
            message: `Spending reached ₹${totalSpent.toLocaleString('en-IN')}, exceeding the allocated budget of ₹${budget.allocatedAmount.toLocaleString('en-IN')}.`,
            type: 'alert',
            link: '/budgets',
          });
        } else if (utilization >= 85) {
          await Notification.create({
            businessId: req.businessId,
            title: `Budget Alert: ${category} (${department})`,
            message: `Spending reached ${utilization.toFixed(0)}% (₹${totalSpent.toLocaleString('en-IN')}) of the ₹${budget.allocatedAmount.toLocaleString('en-IN')} budget cap.`,
            type: 'warning',
            link: '/budgets',
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully.',
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res, next) => {
  try {
    let transaction = await Transaction.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const {
      title,
      amount,
      type,
      category,
      department,
      date,
      paymentMethod,
      description,
      vendor,
      isRecurring,
    } = req.body;

    if (title) transaction.title = title.trim();
    if (amount !== undefined) transaction.amount = Number(amount);
    if (type) transaction.type = type;
    if (category) transaction.category = category;
    if (department) transaction.department = department;
    if (date) transaction.date = new Date(date);
    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (description !== undefined) transaction.description = description.trim();
    if (vendor !== undefined) transaction.vendor = vendor.trim();
    if (isRecurring !== undefined) transaction.isRecurring = Boolean(isRecurring);

    if (req.file) {
      transaction.receiptUrl = `/uploads/${req.file.filename}`;
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.',
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      businessId: req.businessId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export transactions as CSV data
// @route   GET /api/transactions/export/csv
// @access  Private
exports.exportCSV = async (req, res, next) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.businessId);
    const { category, department, type, startDate, endDate } = req.query;

    const query = { businessId };
    if (category && category !== 'All') query.category = category;
    if (department && department !== 'All') query.department = department;
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

    const headers = ['Date', 'Title', 'Type', 'Amount (INR)', 'Category', 'Department', 'Payment Method', 'Vendor', 'Description'];
    const rows = transactions.map((t) => [
      `"${new Date(t.date).toISOString().split('T')[0]}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.type}"`,
      t.amount,
      `"${t.category}"`,
      `"${t.department}"`,
      `"${t.paymentMethod}"`,
      `"${(t.vendor || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
