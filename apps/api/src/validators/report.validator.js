/**
 * Joi validation schemas for report routes.
 */
const Joi = require('joi');

exports.daily = Joi.object({
  date: Joi.date().iso().required(),
  departmentId: Joi.string().hex().length(24),
}).default({});

exports.monthly = Joi.object({
  // YYYY-MM
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  departmentId: Joi.string().hex().length(24),
}).default({});

exports.exportReport = Joi.object({
  format: Joi.string().valid('excel', 'csv', 'pdf').required(),
  from: Joi.date().iso().required(),
  to: Joi.date().iso().required(),
  departmentId: Joi.string().hex().length(24),
}).default({});
