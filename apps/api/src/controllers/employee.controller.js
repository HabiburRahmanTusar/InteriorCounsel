/**
 * Employee controller — handlers wired to routes/employee.routes.js
 * Business logic NOT implemented yet — see employee.service for future implementation.
 */
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'employee.list');
};

exports.getById = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'employee.getById');
};

exports.create = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'employee.create');
};

exports.update = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'employee.update');
};

exports.deactivate = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'employee.deactivate');
};

exports.assignShift = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'employee.assignShift');
};

exports.assignDepartment = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'employee.assignDepartment');
};
