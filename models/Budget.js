const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
    },
    allocatedAmount: {
      type: Number,
      required: [true, 'Allocated budget amount is required'],
      min: [0, 'Allocated budget amount cannot be negative'],
    },
    period: {
      type: String,
      required: [true, 'Budget period is required (e.g., 2026-10 or Q4-2026)'],
      trim: true,
      index: true,
    },
    periodType: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index to prevent duplicate category budget in same period and department for a business
budgetSchema.index({ businessId: 1, department: 1, category: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
