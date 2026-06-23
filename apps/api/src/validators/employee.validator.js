/**
 * Joi validation schemas for employee routes.
 */
const Joi = require('joi');

const idSchema = Joi.string().hex().length(24);

exports.list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  search: Joi.string().trim().allow(''),
  status: Joi.string().valid('active', 'inactive'),
}).default({});

exports.create = Joi.object({
  employeeId: Joi.string().alphanum().min(2).max(20),
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().trim().max(30).allow(''),
  designation: Joi.string().trim().max(120).allow(''),
  role: Joi.string().valid('admin', 'hr', 'manager', 'employee').default('employee'),
  shiftId: idSchema,
  officeLocationId: idSchema,
});

exports.update = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  email: Joi.string().email(),
  phone: Joi.string().trim().max(30).allow(''),
  designation: Joi.string().trim().max(120).allow(''),
  role: Joi.string().valid('admin', 'hr', 'manager', 'employee'),
  shiftId: idSchema,
  officeLocationId: idSchema,
  status: Joi.string().valid('active', 'inactive'),
  password: Joi.string().min(8).max(128),
}).min(1);

exports.assignShift = Joi.object({
  shiftId: idSchema.required(),
});
