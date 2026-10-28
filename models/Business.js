const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      default: 'Information Technology & Services',
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    fiscalYearStart: {
      type: String,
      default: 'April',
    },
    taxId: {
      type: String,
      default: '',
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    settings: {
      budgetWarningThreshold: {
        type: Number,
        default: 80, // Trigger warning at 80%
      },
      budgetDangerThreshold: {
        type: Number,
        default: 90, // Trigger critical warning at 90%
      },
      autoOptimization: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Business', businessSchema);
