/**
 * Report controller — handlers wired to routes/report.routes.js
 * Business logic NOT implemented yet — see report.service for future implementation.
 */
const apiResponse = require('../utils/apiResponse');

exports.daily = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'report.daily');
};

exports.monthly = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'report.monthly');
};

exports.exportReport = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'report.export');
};
