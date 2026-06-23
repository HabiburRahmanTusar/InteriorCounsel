/**
 * Attendance controller — handlers wired to routes/attendance.routes.js
 * Business logic NOT implemented yet — see attendance.service for future implementation.
 */
const apiResponse = require('../utils/apiResponse');

exports.status = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'attendance.status');
};

exports.checkIn = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'attendance.checkIn');
};

exports.checkOut = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'attendance.checkOut');
};

exports.history = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'attendance.history');
};

exports.daily = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'attendance.daily');
};
