const SalaryRecord = require('../models/SalaryRecord');
const DeductionLog = require('../models/DeductionLog');
const User = require('../models/User');
const automationService = require('../services/automation.service');
const apiResponse = require('../utils/apiResponse');
const { dayjs } = require('../utils/time');

exports.overview = async (req, res, next) => {
  try {
    const month = req.query.month || dayjs().tz('Asia/Dhaka').format('YYYY-MM');

    // Make sure we have draft salary records generated for all active employees for this month
    const activeEmployees = await User.find({ role: { $ne: 'admin' }, status: 'active' });
    for (const emp of activeEmployees) {
      const exists = await SalaryRecord.findOne({ employeeId: emp._id, month });
      if (!exists) {
        await automationService.recalculateSalary(emp._id, month);
      }
    }

    const items = await SalaryRecord.find({ month })
      .populate('employeeId', 'name employeeId designation status email salary')
      .sort({ createdAt: -1 });

    return apiResponse.ok(res, items);
  } catch (err) {
    return next(err);
  }
};

exports.reports = async (req, res, next) => {
  try {
    const month = req.query.month || dayjs().tz('Asia/Dhaka').format('YYYY-MM');

    const items = await SalaryRecord.find({ month })
      .populate('employeeId', 'name employeeId designation email status salary')
      .sort({ createdAt: -1 });

    return apiResponse.ok(res, items);
  } catch (err) {
    return next(err);
  }
};

exports.recalculate = async (req, res, next) => {
  try {
    const month = req.body.month || req.query.month || dayjs().tz('Asia/Dhaka').format('YYYY-MM');

    await automationService.evaluateAllActive(month);

    const items = await SalaryRecord.find({ month })
      .populate('employeeId', 'name employeeId designation status email salary')
      .sort({ createdAt: -1 });

    return apiResponse.ok(res, items, 'Payroll calculations refreshed successfully');
  } catch (err) {
    return next(err);
  }
};

exports.pay = async (req, res, next) => {
  try {
    const record = await SalaryRecord.findById(req.params.id);
    if (!record) {
      const error = new Error('Salary record not found');
      error.status = 404;
      throw error;
    }

    record.status = 'Paid';
    record.processedAt = new Date();
    await record.save();

    const populated = await SalaryRecord.findById(record._id).populate(
      'employeeId',
      'name employeeId designation status email salary',
    );

    return apiResponse.ok(res, populated, 'Salary marked as Paid successfully');
  } catch (err) {
    return next(err);
  }
};

exports.deductions = async (req, res, next) => {
  try {
    const { month, employeeId } = req.query;
    const query = {};

    if (month) {
      query.month = month;
    }
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const items = await DeductionLog.find(query)
      .populate('employeeId', 'name employeeId designation')
      .populate({
        path: 'linkedAttendance',
        select: 'attendanceDate checkIn',
      })
      .sort({ timestamp: -1 });

    return apiResponse.ok(res, items);
  } catch (err) {
    return next(err);
  }
};
