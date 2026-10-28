const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Transaction title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Credit Card', 'UPI', 'Corporate Card', 'Cash', 'Vendor Invoice', 'Cheque', 'Other'],
      default: 'Bank Transfer',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    vendor: {
      type: String,
      default: '',
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
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

// Indexes for fast search and aggregation
transactionSchema.index({ businessId: 1, date: -1 });
transactionSchema.index({ businessId: 1, type: 1, date: -1 });
transactionSchema.index({ businessId: 1, department: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
