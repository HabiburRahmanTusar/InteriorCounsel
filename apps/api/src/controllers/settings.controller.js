const settingsService = require('../services/settings.service');
const apiResponse = require('../utils/apiResponse');

exports.listOfficeLocations = async (req, res, next) => {
  try {
    const data = await settingsService.listOfficeLocations();
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.createOfficeLocation = async (req, res, next) => {
  try {
    const data = await settingsService.createOfficeLocation(req.body);
    return apiResponse.created(res, data, 'Office location created');
  } catch (err) {
    return next(err);
  }
};

exports.updateOfficeLocation = async (req, res, next) => {
  try {
    const data = await settingsService.updateOfficeLocation(req.params.id, req.body);
    return apiResponse.ok(res, data, 'Office location updated');
  } catch (err) {
    return next(err);
  }
};

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
