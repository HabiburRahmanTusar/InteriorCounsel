const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const Holiday = require('../models/Holiday');
const apiResponse = require('../utils/apiResponse');
const { dayjs } = require('../utils/time');

async function getWeekends() {
  const setting = await SystemSetting.findOne({ key: 'work-calendar' });
  return setting && setting.value && setting.value.weekends
    ? setting.value.weekends
    : ['Friday', 'Saturday'];
}

async function calculateWorkingDaysBetween(startDate, endDate) {
  const start = dayjs(startDate).tz('Asia/Dhaka').startOf('day');
  const end = dayjs(endDate).tz('Asia/Dhaka').startOf('day');

  if (end.isBefore(start)) return 0;

  return end.diff(start, 'day') + 1;
}

exports.getRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find()
      .populate('employeeId', 'name employeeId designation email')
      .sort({ createdAt: -1 });
    return apiResponse.ok(res, requests);
  } catch (err) {
    return next(err);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason, requestedDays } = req.body;

    const request = new LeaveRequest({
      employeeId,
      startDate,
      endDate,
      leaveType,
      reason,
      requestedDays,
      status: 'Pending',
    });

    await request.save();
    return apiResponse.created(res, request, 'Leave request created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await LeaveRequest.findById(id);
    if (!request) {
      const error = new Error('Leave request not found');
      error.status = 404;
      throw error;
    }

    if (status === 'Approved' && request.status !== 'Approved') {
      // Deduct from balance
      const year = dayjs(request.startDate).year();
      await LeaveBalance.findOneAndUpdate(
        { employeeId: request.employeeId, year },
        { $inc: { used: request.requestedDays } },
        { upsert: true },
      );
    } else if (request.status === 'Approved' && status !== 'Approved') {
      // Revert balance deduction
      const year = dayjs(request.startDate).year();
      await LeaveBalance.findOneAndUpdate(
        { employeeId: request.employeeId, year },
        { $inc: { used: -request.requestedDays } },
      );
    }

    if (status === 'Approved' || status === 'Rejected') {
      request.approvedBy = req.user.id;
      request.approvalDate = new Date();
    } else {
      request.approvedBy = undefined;
      request.approvalDate = undefined;
    }

    request.status = status;
    await request.save();

    const populated = await LeaveRequest.findById(id).populate(
      'employeeId',
      'name employeeId designation email',
    );
    return apiResponse.ok(res, populated, `Leave request ${status.toLowerCase()}`);
  } catch (err) {
    return next(err);
  }
};

exports.getBalances = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || dayjs().year();
    const activeEmployees = await User.find(
      { status: 'active' },
      'name employeeId designation email',
    );

    // Fetch all balances for the year
    const balances = await LeaveBalance.find({ year });
    const balanceMap = new Map();
    balances.forEach((b) => balanceMap.set(b.employeeId.toString(), b));

    const result = activeEmployees.map((emp) => {
      const b = balanceMap.get(emp._id.toString());
      return {
        _id: b ? b._id : null,
        employeeId: emp,
        year,
        allocated: b ? b.allocated : 20,
        used: b ? b.used : 0,
        remaining: b ? b.allocated - b.used : 20,
      };
    });

    return apiResponse.ok(res, result);
  } catch (err) {
    return next(err);
  }
};

exports.updateAllocation = async (req, res, next) => {
  try {
    const { employeeId, year, allocated } = req.body;
    const balance = await LeaveBalance.findOneAndUpdate(
      { employeeId, year },
      { allocated },
      { upsert: true, new: true },
    );
    return apiResponse.ok(res, balance, 'Leave allocation updated');
  } catch (err) {
    return next(err);
  }
};

exports.bulkUpdateAllocation = async (req, res, next) => {
  try {
    const { year, allocated } = req.body;
    const activeEmployees = await User.find({ status: 'active' });

    const operations = activeEmployees.map((emp) => ({
      updateOne: {
        filter: { employeeId: emp._id, year },
        update: { $set: { allocated } },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await LeaveBalance.bulkWrite(operations);
    }

    return apiResponse.ok(
      res,
      { count: operations.length },
      `Leave allocation updated for ${operations.length} employees`,
    );
  } catch (err) {
    return next(err);
  }
};

// --- Employee Endpoints ---

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
    return apiResponse.ok(res, requests);
  } catch (err) {
    return next(err);
  }
};

exports.getMyBalance = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || dayjs().year();
    const balance = await LeaveBalance.findOne({ employeeId: req.user.id, year });

    return apiResponse.ok(res, {
      year,
      allocated: balance ? balance.allocated : 20,
      used: balance ? balance.used : 0,
      remaining: balance ? balance.allocated - balance.used : 20,
    });
  } catch (err) {
    return next(err);
  }
};

exports.submitMyRequest = async (req, res, next) => {
  try {
    const { startDate, endDate, leaveType, reason } = req.body;
    const employeeId = req.user.id;

    if (!startDate || !endDate || !reason) {
      return apiResponse.badRequest(res, 'Start date, end date, and reason are required');
    }

    const start = dayjs(startDate).tz('Asia/Dhaka').startOf('day');
    const end = dayjs(endDate).tz('Asia/Dhaka').endOf('day');

    if (end.isBefore(start)) {
      return apiResponse.badRequest(res, 'End date must be after start date');
    }

    // Auto-calculate working days
    const requestedDays = await calculateWorkingDaysBetween(startDate, endDate);

    if (requestedDays <= 0) {
      return apiResponse.badRequest(res, 'Selected date range contains no working days');
    }

    // Validation 1: Check balance
    const year = start.year();
    const balance = await LeaveBalance.findOne({ employeeId, year });
    const allocated = balance ? balance.allocated : 20;
    const used = balance ? balance.used : 0;
    const remaining = allocated - used;

    if (requestedDays > remaining) {
      return apiResponse.badRequest(
        res,
        `Insufficient leave balance. You are requesting ${requestedDays} days but only have ${remaining} remaining.`,
      );
    }

    // Validation 2: Check overlapping requests
    const overlapping = await LeaveRequest.findOne({
      employeeId,
      status: { $in: ['Pending', 'Approved'] },
      $or: [{ startDate: { $lte: end.toDate() }, endDate: { $gte: start.toDate() } }],
    });

    if (overlapping) {
      return apiResponse.badRequest(
        res,
        'You already have a Pending or Approved leave request during these dates',
      );
    }

    const request = new LeaveRequest({
      employeeId,
      startDate: start.toDate(),
      endDate: end.toDate(),
      leaveType: leaveType || 'Annual',
      reason,
      requestedDays,
      status: 'Pending',
    });

    await request.save();
    return apiResponse.created(res, request, 'Leave request submitted successfully');
  } catch (err) {
    return next(err);
  }
};
