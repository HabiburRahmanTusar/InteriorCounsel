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

function getLeaveAllocated(balance, type) {
  const defaults = { Annual: 15, Sick: 10, Casual: 10 };
  if (!balance) return defaults[type] || 0;
  if (!balance.allocated) return defaults[type] || 0;
  if (typeof balance.allocated === 'number') {
    if (type === 'Annual') return balance.allocated;
    return defaults[type] || 0;
  }
  return typeof balance.allocated[type] === 'number' ? balance.allocated[type] : (defaults[type] || 0);
}

function getLeaveUsed(balance, type) {
  if (!balance) return 0;
  if (!balance.used) return 0;
  if (typeof balance.used === 'number') {
    if (type === 'Annual') return balance.used;
    return 0;
  }
  return typeof balance.used[type] === 'number' ? balance.used[type] : 0;
}

async function calculateWorkingDaysBetween(startDate, endDate) {
  const start = dayjs(startDate).tz('Asia/Dhaka').startOf('day');
  const end = dayjs(endDate).tz('Asia/Dhaka').startOf('day');

  if (end.isBefore(start)) return 0;

  const weekends = await getWeekends();
  const holidays = await Holiday.find();
  const holidaySet = new Set(
    holidays.map((h) => dayjs(h.date).tz('Asia/Dhaka').format('YYYY-MM-DD'))
  );

  let workingDays = 0;
  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dayName = current.format('dddd');
    const dateStr = current.format('YYYY-MM-DD');

    if (!weekends.includes(dayName) && !holidaySet.has(dateStr)) {
      workingDays++;
    }
    current = current.add(1, 'day');
  }

  return workingDays;
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
    const { status, approverRemarks } = req.body;

    const request = await LeaveRequest.findById(id);
    if (!request) {
      const error = new Error('Leave request not found');
      error.status = 404;
      throw error;
    }

    if (request.leaveType !== 'Unpaid') {
      const field = `used.${request.leaveType}`;
      const year = dayjs(request.startDate).year();

      if (status === 'Approved' && request.status !== 'Approved') {
        // Deduct from balance
        await LeaveBalance.findOneAndUpdate(
          { employeeId: request.employeeId, year },
          { $inc: { [field]: request.requestedDays } },
          { upsert: true },
        );
      } else if (request.status === 'Approved' && status !== 'Approved') {
        // Revert balance deduction
        await LeaveBalance.findOneAndUpdate(
          { employeeId: request.employeeId, year },
          { $inc: { [field]: -request.requestedDays } },
        );
      }
    }

    if (status === 'Approved' || status === 'Rejected') {
      request.approvedBy = req.user.id;
      request.approvalDate = new Date();
    } else {
      request.approvedBy = undefined;
      request.approvalDate = undefined;
    }

    request.status = status;
    if (approverRemarks !== undefined) {
      request.approverRemarks = approverRemarks;
    }

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

      const allocatedAnnual = getLeaveAllocated(b, 'Annual');
      const allocatedSick = getLeaveAllocated(b, 'Sick');
      const allocatedCasual = getLeaveAllocated(b, 'Casual');

      const usedAnnual = getLeaveUsed(b, 'Annual');
      const usedSick = getLeaveUsed(b, 'Sick');
      const usedCasual = getLeaveUsed(b, 'Casual');

      return {
        _id: b ? b._id : null,
        employeeId: emp,
        year,
        allocated: {
          Annual: allocatedAnnual,
          Sick: allocatedSick,
          Casual: allocatedCasual,
        },
        used: {
          Annual: usedAnnual,
          Sick: usedSick,
          Casual: usedCasual,
        },
        remaining: {
          Annual: allocatedAnnual - usedAnnual,
          Sick: allocatedSick - usedSick,
          Casual: allocatedCasual - usedCasual,
        },
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
      {
        $set: {
          'allocated.Annual': allocated.Annual,
          'allocated.Sick': allocated.Sick,
          'allocated.Casual': allocated.Casual,
        }
      },
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
        update: {
          $set: {
            'allocated.Annual': allocated.Annual,
            'allocated.Sick': allocated.Sick,
            'allocated.Casual': allocated.Casual,
          }
        },
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

    const allocatedAnnual = getLeaveAllocated(balance, 'Annual');
    const allocatedSick = getLeaveAllocated(balance, 'Sick');
    const allocatedCasual = getLeaveAllocated(balance, 'Casual');

    const usedAnnual = getLeaveUsed(balance, 'Annual');
    const usedSick = getLeaveUsed(balance, 'Sick');
    const usedCasual = getLeaveUsed(balance, 'Casual');

    return apiResponse.ok(res, {
      year,
      allocated: {
        Annual: allocatedAnnual,
        Sick: allocatedSick,
        Casual: allocatedCasual,
      },
      used: {
        Annual: usedAnnual,
        Sick: usedSick,
        Casual: usedCasual,
      },
      remaining: {
        Annual: allocatedAnnual - usedAnnual,
        Sick: allocatedSick - usedSick,
        Casual: allocatedCasual - usedCasual,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.submitMyRequest = async (req, res, next) => {
  try {
    const { startDate, endDate, leaveType, reason, halfDay } = req.body;
    const employeeId = req.user.id;

    if (!startDate || !endDate || !reason) {
      return apiResponse.badRequest(res, 'Start date, end date, and reason are required');
    }

    const start = dayjs(startDate).tz('Asia/Dhaka').startOf('day');
    const end = dayjs(endDate).tz('Asia/Dhaka').endOf('day');

    if (end.isBefore(start)) {
      return apiResponse.badRequest(res, 'End date must be after start date');
    }

    let requestedDays;
    if (halfDay) {
      if (!start.isSame(end, 'day')) {
        return apiResponse.badRequest(res, 'Half day leave must start and end on the same day');
      }
      requestedDays = 0.5;
    } else {
      // Auto-calculate working days
      requestedDays = await calculateWorkingDaysBetween(startDate, endDate);
    }

    if (requestedDays <= 0) {
      return apiResponse.badRequest(res, 'Selected date range contains no working days');
    }

    // Validation 1: Check balance
    const type = leaveType || 'Annual';
    if (type !== 'Unpaid') {
      const year = start.year();
      const balance = await LeaveBalance.findOne({ employeeId, year });
      const allocated = getLeaveAllocated(balance, type);
      const used = getLeaveUsed(balance, type);
      const remaining = allocated - used;

      if (requestedDays > remaining) {
        return apiResponse.badRequest(
          res,
          `Insufficient leave balance. You are requesting ${requestedDays} days of ${type} leave but only have ${remaining} remaining.`,
        );
      }
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
      leaveType: type,
      reason,
      requestedDays,
      halfDay: !!halfDay,
      status: 'Pending',
    });

    await request.save();
    return apiResponse.created(res, request, 'Leave request submitted successfully');
  } catch (err) {
    return next(err);
  }
};

exports.cancelMyRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    const request = await LeaveRequest.findOne({ _id: id, employeeId });
    if (!request) {
      return apiResponse.notFound(res, 'Leave request not found');
    }

    if (request.status === 'Cancelled') {
      return apiResponse.badRequest(res, 'Leave request is already cancelled');
    }

    if (request.status === 'Rejected') {
      return apiResponse.badRequest(res, 'Cannot cancel a rejected leave request');
    }

    // If it was approved, we can only cancel if it hasn't started yet
    if (request.status === 'Approved') {
      const today = dayjs().tz('Asia/Dhaka').startOf('day');
      const start = dayjs(request.startDate).tz('Asia/Dhaka').startOf('day');
      if (start.isBefore(today)) {
        return apiResponse.badRequest(res, 'Cannot cancel an approved leave request that has already started');
      }

      // Revert the balance deduction
      if (request.leaveType !== 'Unpaid') {
        const field = `used.${request.leaveType}`;
        const year = dayjs(request.startDate).year();
        await LeaveBalance.findOneAndUpdate(
          { employeeId, year },
          { $inc: { [field]: -request.requestedDays } }
        );
      }
    }

    request.status = 'Cancelled';
    await request.save();

    return apiResponse.ok(res, request, 'Leave request cancelled successfully');
  } catch (err) {
    return next(err);
  }
};
