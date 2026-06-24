/**
 * Joi validation schemas for settings routes.
 */
const Joi = require('joi');

exports.updateAttendanceRules = Joi.object({
  defaultGracePeriodMinutes: Joi.number().integer().min(0).max(120),
  defaultTimezone: Joi.string(),
}).min(1);

exports.updateCompany = Joi.object({
  name: Joi.string().trim().min(2).max(160),
  legalName: Joi.string().trim().max(200).allow(''),
  address: Joi.string().trim().max(400).allow(''),
  logoUrl: Joi.string().uri().allow(''),
}).min(1);
