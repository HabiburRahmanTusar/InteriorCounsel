/**
 * Settings controller — handlers wired to routes/settings.routes.js
 * Business logic NOT implemented yet.
 */
const apiResponse = require('../utils/apiResponse');

exports.listOfficeLocations = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'settings.listOfficeLocations');
};

exports.createOfficeLocation = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'settings.createOfficeLocation');
};

exports.updateOfficeLocation = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'settings.updateOfficeLocation');
};

exports.updateAttendanceRules = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'settings.updateAttendanceRules');
};

exports.getCompany = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'settings.getCompany');
};

exports.updateCompany = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'settings.updateCompany');
};
