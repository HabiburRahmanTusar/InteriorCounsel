const reportService = require('../services/report.service');
const apiResponse = require('../utils/apiResponse');

exports.daily = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      const error = new Error('Date parameter is required');
      error.status = 400;
      throw error;
    }
    const data = await reportService.daily({ date });
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.monthly = async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month) {
      const error = new Error('Month parameter is required');
      error.status = 400;
      throw error;
    }
    const data = await reportService.monthly({ month });
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const { format, from, to } = req.query;
    if (!from || !to) {
      const error = new Error('From and to date parameters are required');
      error.status = 400;
      throw error;
    }
    const { buffer, contentType } = await reportService.exportReport({
      format: format || 'excel',
      from,
      to,
    });
    res.setHeader('Content-Type', contentType);
    let filename = `report-${from}-${to}`;
    if (format === 'csv') filename += '.csv';
    else if (format === 'pdf') filename += '.pdf';
    else filename += '.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
};

exports.employeeWise = async (req, res, next) => {
  try {
    const { employeeId, from, to } = req.query;
    if (!employeeId || !from || !to) {
      const error = new Error('employeeId, from, and to parameters are required');
      error.status = 400;
      throw error;
    }
    const data = await reportService.employeeWise({ employeeId, from, to });
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.exportEmployeeWise = async (req, res, next) => {
  try {
    const { format, employeeId, from, to } = req.query;
    if (!employeeId || !from || !to) {
      const error = new Error('employeeId, from, and to parameters are required');
      error.status = 400;
      throw error;
    }
    const { buffer, contentType } = await reportService.exportEmployeeWise({
      format: format || 'excel',
      employeeId,
      from,
      to,
    });
    res.setHeader('Content-Type', contentType);

    const User = require('../models/User');
    const user = await User.findById(employeeId);
    const empCode = user ? user.employeeId : 'EMP';

    let filename = `employee-report-${empCode}-${from}-${to}`;
    if (format === 'csv') filename += '.csv';
    else if (format === 'pdf') filename += '.pdf';
    else filename += '.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
};

exports.leaveWise = async (req, res, next) => {
  try {
    const { employeeId, leaveType, from, to } = req.query;
    if (!from || !to) {
      const error = new Error('from and to parameters are required');
      error.status = 400;
      throw error;
    }
    const data = await reportService.leaveWise({ employeeId, leaveType, from, to });
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.exportLeaveWise = async (req, res, next) => {
  try {
    const { format, employeeId, leaveType, from, to } = req.query;
    if (!from || !to) {
      const error = new Error('from and to parameters are required');
      error.status = 400;
      throw error;
    }
    const { buffer, contentType } = await reportService.exportLeaveWise({
      format: format || 'excel',
      employeeId,
      leaveType,
      from,
      to,
    });
    res.setHeader('Content-Type', contentType);

    let filename = `leave-report-${from}-${to}`;
    if (format === 'csv') filename += '.csv';
    else if (format === 'pdf') filename += '.pdf';
    else filename += '.xlsx';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
};
