const reportService = require('../services/report.service');
const apiResponse = require('../utils/apiResponse');

exports.daily = async (req, res, next) => {
  try {
    const { date, departmentId } = req.query;
    if (!date) {
      const error = new Error('Date parameter is required');
      error.status = 400;
      throw error;
    }
    const data = await reportService.daily({ date, departmentId });
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.monthly = async (req, res, next) => {
  try {
    const { month, departmentId } = req.query;
    if (!month) {
      const error = new Error('Month parameter is required');
      error.status = 400;
      throw error;
    }
    const data = await reportService.monthly({ month, departmentId });
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const { format, from, to, departmentId } = req.query;
    if (!from || !to) {
      const error = new Error('From and to date parameters are required');
      error.status = 400;
      throw error;
    }
    const { buffer, contentType } = await reportService.exportReport({
      format: format || 'excel',
      from,
      to,
      departmentId,
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
