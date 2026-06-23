/**
 * Joi validation schemas for shift routes.
 */
const Joi = require('joi');

const timeSchema = Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/);

exports.create = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  startTime: timeSchema.required(),
  endTime: timeSchema.required(),
  gracePeriod: Joi.number().integer().min(0).max(120).default(15),
});

exports.update = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  startTime: timeSchema,
  endTime: timeSchema,
  gracePeriod: Joi.number().integer().min(0).max(120),
}).min(1);
