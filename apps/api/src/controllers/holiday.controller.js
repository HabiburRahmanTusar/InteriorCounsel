const Holiday = require('../models/Holiday');
const apiResponse = require('../utils/apiResponse');
const automationService = require('../services/automation.service');
const { dayjs } = require('../utils/time');

exports.list = async (req, res, next) => {
  try {
    const items = await Holiday.find({}).sort({ date: 1 });
    return apiResponse.ok(res, items);
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, date } = req.body;
    if (!name || !date) {
      const error = new Error('Holiday name and date are required');
      error.status = 400;
      throw error;
    }

    const dateParsed = dayjs(date).tz('Asia/Dhaka').startOf('day').toDate();

    const exists = await Holiday.findOne({ date: dateParsed });
    if (exists) {
      const error = new Error('A holiday already exists on this date');
      error.status = 400;
      throw error;
    }

    const item = await Holiday.create({ name, date: dateParsed });

    // Trigger asynchronous recalculation for all active employees for this month
    const monthStr = dayjs(dateParsed).format('YYYY-MM');
    automationService.evaluateAllActive(monthStr).catch((err) =>
      console.error('Failed to trigger recalculation after adding holiday:', err)
    );

    return apiResponse.created(res, item, 'Holiday created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await Holiday.findById(req.params.id);
    if (!item) {
      const error = new Error('Holiday not found');
      error.status = 404;
      throw error;
    }

    const dateParsed = item.date;
    await item.deleteOne();

    // Trigger recalculation for the affected month
    const monthStr = dayjs(dateParsed).format('YYYY-MM');
    automationService.evaluateAllActive(monthStr).catch((err) =>
      console.error('Failed to trigger recalculation after removing holiday:', err)
    );

    return apiResponse.noContent(res);
  } catch (err) {
    return next(err);
  }
};
