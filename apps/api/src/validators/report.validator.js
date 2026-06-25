/**
 * Joi validation schemas for report routes.
 */
const Joi = require('joi');

exports.daily = Joi.object({
  date: Joi.date().iso().required(),
}).default({});

exports.monthly = Joi.object({
  // YYYY-MM
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required(),
}).default({});

exports.exportReport = Joi.object({
  format: Joi.string().valid('excel', 'csv', 'pdf').required(),
  from: Joi.date().iso().required(),
  to: Joi.date().iso().required(),
}).default({});

exports.employeeWise = Joi.object({
  employeeId: Joi.string().hex().length(24).required(),
  from: Joi.date().iso().required(),
  to: Joi.date().iso().required(),
}).default({});

exports.exportEmployeeWise = Joi.object({
  format: Joi.string().valid('excel', 'csv', 'pdf').required(),
  employeeId: Joi.string().hex().length(24).required(),
  from: Joi.date().iso().required(),
  to: Joi.date().iso().required(),
}).default({});
