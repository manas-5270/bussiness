const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.route('/')
  .get(getDepartments)
  .post(authorize('Admin', 'Finance Manager'), createDepartment);

router.route('/:id')
  .put(authorize('Admin', 'Finance Manager'), updateDepartment)
  .delete(authorize('Admin'), deleteDepartment);

module.exports = router;
