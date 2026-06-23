/**
 * Joi validation schemas for auth routes.
 */
const Joi = require('joi');

exports.login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

exports.refreshToken = Joi.object({
  refreshToken: Joi.string().required(),
});

exports.forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

exports.resetPassword = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});
