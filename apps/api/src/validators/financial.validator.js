/**
 * Joi validation schemas for financial routes.
 */
const Joi = require('joi');

exports.createFinancialRecord = Joi.object({
  period: Joi.string().pattern(/^\d{4}-\d{2}$/).required().messages({
    'string.pattern.base': 'Period must be in YYYY-MM format',
    'any.required': 'Period is required',
  }),
  monthlySales: Joi.number().min(0).required(),
  monthlyProfit: Joi.number().required(),
  outstandingDue: Joi.number().min(0).required(),
  billsPendingCollection: Joi.number().min(0).required(),
  prevProfitShareBalance: Joi.number().required(),
  recentProfit: Joi.number().required(),
  currentTotalBalance: Joi.number().required(),
  monthlySubsidy: Joi.number().min(0).required(),
});

exports.updateFinancialRecord = Joi.object({
  period: Joi.string().pattern(/^\d{4}-\d{2}$/).messages({
    'string.pattern.base': 'Period must be in YYYY-MM format',
  }),
  monthlySales: Joi.number().min(0),
  monthlyProfit: Joi.number(),
  outstandingDue: Joi.number().min(0),
  billsPendingCollection: Joi.number().min(0),
  prevProfitShareBalance: Joi.number(),
  recentProfit: Joi.number(),
  currentTotalBalance: Joi.number(),
  monthlySubsidy: Joi.number().min(0),
});
