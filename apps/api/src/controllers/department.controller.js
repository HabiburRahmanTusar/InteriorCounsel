const apiResponse = require('../utils/apiResponse');
const Department = require('../models/Department');
const User = require('../models/User');

exports.list = async (req, res, next) => {
  try {
    const departments = await Department.find().populate('managerId').sort({ name: 1 });
    return apiResponse.ok(res, departments);
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const department = await Department.create(req.body);
    return apiResponse.created(res, department, 'Department created');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!department) return apiResponse.notFound(res, 'Department not found');
    return apiResponse.ok(res, department, 'Department updated');
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Guard check: is any employee assigned to this department?
    const userCount = await User.countDocuments({ departmentId: req.params.id });
    if (userCount > 0) {
      const error = new Error('Cannot delete department: employees are currently assigned to it');
      error.status = 400;
      throw error;
    }
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return apiResponse.notFound(res, 'Department not found');
    return apiResponse.noContent(res);
  } catch (err) {
    return next(err);
  }
};
