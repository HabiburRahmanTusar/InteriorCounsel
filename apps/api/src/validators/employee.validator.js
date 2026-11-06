/**
 * Joi validation schemas for employee routes.
 */
const Joi = require('joi');

const idSchema = Joi.string().hex().length(24).allow(null).empty('').default(null);

exports.list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
  search: Joi.string().trim().allow(''),
  status: Joi.string().valid('active', 'inactive'),
}).default({});

exports.create = Joi.object({
  employeeId: Joi.string().trim().max(30).allow('', null),
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().max(30).allow('', null),
  designation: Joi.string().trim().max(120).allow('', null),
  salary: Joi.number().min(0).allow(null),
  role: Joi.string().trim().default('employee'),
  shiftId: idSchema,
  employeeType: idSchema,
  status: Joi.string().valid('active', 'inactive').default('active'),
  joiningDate: Joi.any().allow(null, ''),
  resignationDate: Joi.any().allow(null, ''),
});

exports.update = Joi.object({
  employeeId: Joi.string().trim().max(30).allow('', null),
  name: Joi.string().trim().min(2).max(120),
  email: Joi.string().email(),
  phone: Joi.string().trim().max(30).allow('', null),
  designation: Joi.string().trim().max(120).allow('', null),
  salary: Joi.number().min(0).allow(null),
  role: Joi.string().trim(),
  shiftId: idSchema,
  employeeType: idSchema,
  status: Joi.string().valid('active', 'inactive'),
  password: Joi.string().min(4).max(128).allow('', null),
  joiningDate: Joi.any().allow(null, ''),
  resignationDate: Joi.any().allow(null, ''),
}).min(1);

exports.assignShift = Joi.object({
  shiftId: idSchema.required(),
});
