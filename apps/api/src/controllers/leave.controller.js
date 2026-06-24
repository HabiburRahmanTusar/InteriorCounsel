const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const User = require('../models/User');
const apiResponse = require('../utils/apiResponse');
const { dayjs } = require('../utils/time');

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
      status: 'Pending'
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
        { upsert: true }
      );
    } else if (request.status === 'Approved' && status !== 'Approved') {
      // Revert balance deduction
      const year = dayjs(request.startDate).year();
      await LeaveBalance.findOneAndUpdate(
        { employeeId: request.employeeId, year },
        { $inc: { used: -request.requestedDays } }
      );
    }

    request.status = status;
    await request.save();

    const populated = await LeaveRequest.findById(id).populate('employeeId', 'name employeeId designation email');
    return apiResponse.ok(res, populated, `Leave request ${status.toLowerCase()}`);
  } catch (err) {
    return next(err);
  }
};

exports.getBalances = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || dayjs().year();
    const activeEmployees = await User.find({ role: { $ne: 'admin' }, status: 'active' }, 'name employeeId designation email');
    
    // Fetch all balances for the year
    const balances = await LeaveBalance.find({ year });
    const balanceMap = new Map();
    balances.forEach(b => balanceMap.set(b.employeeId.toString(), b));

    const result = activeEmployees.map(emp => {
      const b = balanceMap.get(emp._id.toString());
      return {
        _id: b ? b._id : null,
        employeeId: emp,
        year,
        allocated: b ? b.allocated : 20,
        used: b ? b.used : 0,
        remaining: b ? (b.allocated - b.used) : 20
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
      { upsert: true, new: true }
    );
    return apiResponse.ok(res, balance, 'Leave allocation updated');
  } catch (err) {
    return next(err);
  }
};
