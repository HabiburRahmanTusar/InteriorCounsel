const settingsService = require('../services/settings.service');
const apiResponse = require('../utils/apiResponse');

exports.updateAttendanceRules = async (req, res, next) => {
  try {
    await settingsService.updateAttendanceRules(req.body);
    return apiResponse.ok(res, null, 'Attendance rules updated');
  } catch (err) {
    return next(err);
  }
};

exports.getCompany = async (req, res, next) => {
  try {
    const data = await settingsService.getCompany();
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.updateCompany = async (req, res, next) => {
  try {
    await settingsService.updateCompany(req.body);
    return apiResponse.ok(res, null, 'Company information updated');
  } catch (err) {
    return next(err);
  }
};
