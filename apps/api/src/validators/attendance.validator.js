/**
 * Joi validation schemas for attendance routes.
 */
const Joi = require('joi');

exports.checkIn = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
});

exports.checkOut = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
});

exports.history = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
}).default({});

exports.daily = Joi.object({
  date: Joi.date().iso().required(),
}).default({});
