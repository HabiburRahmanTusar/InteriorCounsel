/**
 * Joi validation schemas for settings routes.
 */
const Joi = require('joi');

exports.createOfficeLocation = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().integer().min(1).max(5000).default(100),
});

exports.updateOfficeLocation = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  radius: Joi.number().integer().min(1).max(5000),
}).min(1);

exports.updateAttendanceRules = Joi.object({
  defaultGracePeriodMinutes: Joi.number().integer().min(0).max(120),
  defaultOfficeRadiusMeters: Joi.number().integer().min(1).max(5000),
  defaultTimezone: Joi.string(),
}).min(1);

exports.updateCompany = Joi.object({
  name: Joi.string().trim().min(2).max(160),
  legalName: Joi.string().trim().max(200).allow(''),
  address: Joi.string().trim().max(400).allow(''),
  logoUrl: Joi.string().uri().allow(''),
}).min(1);
