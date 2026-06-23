/**
 * Department controller — handlers wired to routes/department.routes.js
 */
const apiResponse = require('../utils/apiResponse');
const Department = require('../models/Department');

exports.list = async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  return apiResponse.success(res, departments);
};

exports.create = async (req, res) => {
  const department = await Department.create(req.body);
  return apiResponse.success(res, department, 201);
};

exports.update = async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!department) return apiResponse.notFound(res, 'Department not found');
  return apiResponse.success(res, department);
};

exports.remove = async (req, res) => {
  const department = await Department.findByIdAndDelete(req.params.id);
  if (!department) return apiResponse.notFound(res, 'Department not found');
  return apiResponse.success(res, null, 204);
};
