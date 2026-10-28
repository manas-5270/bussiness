const Department = require('../models/Department');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Get all departments for business with head counts & spend summary
// @route   GET /api/departments
// @access  Private
exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ businessId: req.businessId }).sort({ name: 1 });

    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const budgets = await Budget.find({ businessId: req.businessId, department: dept.name });
        const totalBudget = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);

        const tx = await Transaction.aggregate([
          { $match: { businessId: req.businessId, department: dept.name, type: 'expense' } },
          { $group: { _id: null, totalSpent: { $sum: '$amount' } } },
        ]);
        const totalSpent = tx[0] ? tx[0].totalSpent : 0;

        return {
          _id: dept._id,
          name: dept.name,
          code: dept.code,
          head: dept.head,
          description: dept.description,
          color: dept.color,
          teamSize: dept.teamSize,
          totalBudget,
          totalSpent,
          utilization: totalBudget > 0 ? Number(((totalSpent / totalBudget) * 100).toFixed(1)) : 0,
        };
      })
    );

    res.status(200).json({ success: true, count: enriched.length, departments: enriched });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (Admin / Finance Manager)
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, head, description, color, teamSize } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const existing = await Department.findOne({ businessId: req.businessId, name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Department with this name already exists.' });
    }

    const dept = await Department.create({
      businessId: req.businessId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : name.slice(0, 3).toUpperCase(),
      head: head || '',
      description: description || '',
      color: color || '#2563eb',
      teamSize: Number(teamSize) || 1,
    });

    res.status(201).json({ success: true, message: 'Department created successfully.', department: dept });
  } catch (error) {
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin / Finance Manager)
exports.updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const { name, code, head, description, color, teamSize } = req.body;
    if (name) dept.name = name.trim();
    if (code) dept.code = code.trim().toUpperCase();
    if (head !== undefined) dept.head = head.trim();
    if (description !== undefined) dept.description = description.trim();
    if (color) dept.color = color;
    if (teamSize !== undefined) dept.teamSize = Number(teamSize);

    await dept.save();

    res.status(200).json({ success: true, message: 'Department updated successfully.', department: dept });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin)
exports.deleteDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    res.status(200).json({ success: true, message: 'Department deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
