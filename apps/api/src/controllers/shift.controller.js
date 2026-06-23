/**
 * Shift controller — handlers wired to routes/shift.routes.js
 * Business logic NOT implemented yet.
 */
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'shift.list');
};

exports.create = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'shift.create');
};

exports.update = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'shift.update');
};

exports.remove = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'shift.remove');
};
