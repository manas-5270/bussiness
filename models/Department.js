const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    head: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#2563eb', // Hex color for charts & UI badges
    },
    teamSize: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

departmentSchema.index({ businessId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
