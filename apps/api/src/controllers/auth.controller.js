/**
 * Auth controller — handlers wired to routes/auth.routes.js
 * Business logic NOT implemented yet — see auth.service for future implementation.
 */
const apiResponse = require('../utils/apiResponse');

exports.login = async (req, res, next) => {
  // TODO: delegate to auth.service.login
  return apiResponse.notImplemented(res, 'auth.login');
};

exports.logout = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'auth.logout');
};

exports.refreshToken = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'auth.refreshToken');
};

exports.forgotPassword = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'auth.forgotPassword');
};

exports.resetPassword = async (req, res, next) => {
  return apiResponse.notImplemented(res, 'auth.resetPassword');
};
