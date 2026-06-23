/**
 * Joi validation schemas for department routes.
 */
const Joi = require('joi');

const idSchema = Joi.string().hex().length(24);

exports.create = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  managerId: idSchema.allow(null),
});

exports.update = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  managerId: idSchema.allow(null),
}).min(1);
