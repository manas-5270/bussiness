const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    currentAllocation: {
      type: Number,
      required: true,
      min: 0,
    },
    suggestedAllocation: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedSavings: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
    },
    metrics: {
      currentSpend: Number,
      utilizationRate: Number,
      momChangePercentage: Number,
      projectedRunRate: Number,
      benchmark: String,
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Dismissed', 'Reviewed'],
      default: 'Pending',
    },
    actionTakenAt: {
      type: Date,
    },
    actionTakenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

recommendationSchema.index({ businessId: 1, status: 1, priority: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
