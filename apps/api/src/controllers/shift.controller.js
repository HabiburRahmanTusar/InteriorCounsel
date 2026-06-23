const shiftService = require('../services/shift.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const data = await shiftService.list();
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await shiftService.create(req.body);
    return apiResponse.created(res, data, 'Shift created');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await shiftService.update(req.params.id, req.body);
    return apiResponse.ok(res, data, 'Shift updated');
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await shiftService.remove(req.params.id);
    return apiResponse.noContent(res);
  } catch (err) {
    return next(err);
  }
};
