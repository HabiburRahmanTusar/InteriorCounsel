const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const Holiday = require('../models/Holiday');
const leavePolicyService = require('../services/leavePolicy.service');
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

// Helper to aggregate an array of LeaveBalance docs into the legacy shape
function aggregateBalances(balances, leaveTypes) {
  const result = {
    allocated: { Annual: 0, Sick: 0, Casual: 0 },
    used: { Annual: 0, Sick: 0, Casual: 0 },
    remaining: { Annual: 0, Sick: 0, Casual: 0 },
  };

  if (!balances || balances.length === 0) return result;

  balances.forEach(b => {
    // Find the code of this leave type. `b.leaveType` could be populated or an ObjectId.
    let code = null;
    if (b.leaveType && b.leaveType.code) {
      code = b.leaveType.code;
    } else {
      const lt = leaveTypes.find(t => t._id.toString() === b.leaveType.toString());
      if (lt) code = lt.code;
    }

    if (code) {
      // Map 'annual', 'sick', 'casual' to 'Annual', 'Sick', 'Casual'
      const key = code.charAt(0).toUpperCase() + code.slice(1);
      if (result.allocated[key] !== undefined) {
        result.allocated[key] = b.allocated || 0;
        result.used[key] = b.used || 0;
        result.remaining[key] = (b.allocated || 0) - (b.used || 0);
      }
    }
  });

  return result;
}

async function resolveApprovalStagesForEmployee(employeeId) {
  const user = await User.findById(employeeId);
  if (!user) throw new Error('Employee not found');

  const ApprovalWorkflow = require('../models/ApprovalWorkflow');
  const workflow = await ApprovalWorkflow.findOne({
    applicantRole: user.role.toLowerCase(),
    isActive: true,
  });

  if (workflow && workflow.stages && workflow.stages.length > 0) {
    const hasManagerStage = workflow.stages.some(stage => stage.role === 'manager');
    if (hasManagerStage && !user.reportsTo) {
      throw new Error('Direct manager is required for manager approval stage');
    }
    return workflow.stages.map((stage) => ({
      sequence: stage.sequence,
      role: stage.role,
      status: 'Pending',
    }));
  }

  // Fallback to default single-stage 'hr'
  return [
    {
      sequence: 1,
      role: 'hr',
      status: 'Pending',
    },
  ];
}

exports.getRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find()
      .populate('employeeId', 'name employeeId designation email role reportsTo')
      .populate('leaveType')
      .sort({ createdAt: -1 });
    
    // For backwards compatibility with frontend that expects string in leaveType
    const formattedRequests = requests.map(r => {
      const obj = r.toObject();
      if (obj.leaveType && obj.leaveType.code) {
        obj.leaveType = obj.leaveType.code.charAt(0).toUpperCase() + obj.leaveType.code.slice(1);
      }
      return obj;
    });

    if (req.user.role === 'admin') {
      return apiResponse.ok(res, formattedRequests);
    }

    const userRole = req.user.role.toLowerCase();
    const userId = req.user.id.toString();

    const filtered = formattedRequests.filter(reqObj => {
      // 1. Is the user currently the active approver for this request?
      const activeStage = reqObj.approvalStages && reqObj.approvalStages.length > 0
        ? reqObj.approvalStages.find(s => s.status === 'Pending')
        : null;

      if (activeStage) {
        const activeRole = activeStage.role.toLowerCase();
        if (activeRole === userRole) {
          if (activeRole === 'manager') {
            const reportsTo = reqObj.employeeId && (reqObj.employeeId.reportsTo?._id || reqObj.employeeId.reportsTo);
            return reportsTo && reportsTo.toString() === userId;
          }
          return true;
        }
      } else {
        // Legacy requests (no approval stages) - fallback to HR
        if (userRole === 'hr' && reqObj.status === 'Pending') {
          return true;
        }
      }

      // 2. Has the user already participated in the approval/rejection of this request?
      const hasParticipated = reqObj.approvalStages && reqObj.approvalStages.some(s => s.approvedBy && s.approvedBy.toString() === userId);
      if (hasParticipated) {
        return true;
      }

      return false;
    });
      
    return apiResponse.ok(res, filtered);
  } catch (err) {
    return next(err);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason, requestedDays } = req.body;

    const leaveTypeDoc = await LeaveType.findOne({ code: leaveType.toLowerCase() });
    if (!leaveTypeDoc) {
      return apiResponse.badRequest(res, 'Invalid leave type');
    }

    let approvalStages;
    try {
      approvalStages = await resolveApprovalStagesForEmployee(employeeId);
    } catch (e) {
      return apiResponse.badRequest(res, e.message);
    }

    const request = new LeaveRequest({
      employeeId,
      startDate,
      endDate,
      leaveType: leaveTypeDoc._id,
      reason,
      requestedDays,
      status: 'Pending',
      approvalStages,
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

    const request = await LeaveRequest.findById(id).populate('leaveType');
    if (!request) {
      return apiResponse.notFound(res, 'Leave request not found');
    }

    if (request.status === 'Cancelled' || request.status === 'Rejected') {
      return apiResponse.badRequest(res, `Cannot update a request that is already ${request.status.toLowerCase()}`);
    }

    const activeStage = request.approvalStages && request.approvalStages.length > 0
      ? request.approvalStages.find(s => s.status === 'Pending')
      : null;

    if (activeStage) {
      // Check authorization
      const isAdmin = req.user.role === 'admin';
      let isAuthorized = false;

      if (isAdmin) {
        isAuthorized = true;
      } else if (activeStage.role === 'manager') {
        const applicant = await User.findById(request.employeeId);
        if (applicant && applicant.reportsTo && applicant.reportsTo.toString() === req.user.id.toString()) {
          isAuthorized = true;
        }
      } else if (req.user.role.toLowerCase() === activeStage.role.toLowerCase()) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return apiResponse.forbidden(
          res,
          `You are not authorized to approve the current stage: ${activeStage.label || activeStage.role}`
        );
      }

      // Process status update
      if (status === 'Rejected') {
        activeStage.status = 'Rejected';
        activeStage.approvedBy = req.user.id;
        activeStage.approvalDate = new Date();
        activeStage.remarks = approverRemarks || '';

        request.status = 'Rejected';
        request.approvedBy = req.user.id;
        request.approvalDate = new Date();
        request.approverRemarks = approverRemarks || '';
      } else if (status === 'Approved') {
        activeStage.status = 'Approved';
        activeStage.approvedBy = req.user.id;
        activeStage.approvalDate = new Date();
        activeStage.remarks = approverRemarks || '';

        // Check if there are further pending stages
        const hasNextStage = request.approvalStages.some(s => s.status === 'Pending');
        if (!hasNextStage) {
          // Final approval
          request.status = 'Approved';
          request.approvedBy = req.user.id;
          request.approvalDate = new Date();
          request.approverRemarks = approverRemarks || '';

          // Deduct from balance
          if (request.leaveType && request.leaveType.deductsFromBalance) {
            const year = dayjs(request.startDate).year();
            await LeaveBalance.findOneAndUpdate(
              { employeeId: request.employeeId, year, leaveType: request.leaveType._id },
              { $inc: { used: request.requestedDays } },
              { upsert: true }
            );
          }
        }
      }
    } else {
      // Legacy request fallback
      if (status === 'Approved' && request.status !== 'Approved') {
        if (request.leaveType && request.leaveType.deductsFromBalance) {
          const year = dayjs(request.startDate).year();
          await LeaveBalance.findOneAndUpdate(
            { employeeId: request.employeeId, year, leaveType: request.leaveType._id },
            { $inc: { used: request.requestedDays } },
            { upsert: true }
          );
        }
      } else if (request.status === 'Approved' && status !== 'Approved') {
        if (request.leaveType && request.leaveType.deductsFromBalance) {
          const year = dayjs(request.startDate).year();
          await LeaveBalance.findOneAndUpdate(
            { employeeId: request.employeeId, year, leaveType: request.leaveType._id },
            { $inc: { used: -request.requestedDays } }
          );
        }
      }
      request.status = status;
      request.approvedBy = req.user.id;
      request.approvalDate = new Date();
      if (approverRemarks !== undefined) {
        request.approverRemarks = approverRemarks;
      }
    }

    await request.save();

    const populated = await LeaveRequest.findById(id)
      .populate('employeeId', 'name employeeId designation email')
      .populate('leaveType');

    const formattedRequest = populated.toObject();
    if (formattedRequest.leaveType && formattedRequest.leaveType.code) {
      formattedRequest.leaveType =
        formattedRequest.leaveType.code.charAt(0).toUpperCase() +
        formattedRequest.leaveType.code.slice(1);
    }

    return apiResponse.ok(res, formattedRequest, `Leave request ${status.toLowerCase()}`);
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

    const balances = await LeaveBalance.find({ year }).populate('leaveType');
    const leaveTypes = await LeaveType.find();
    
    const balanceMap = new Map();
    balances.forEach((b) => {
      const empId = b.employeeId.toString();
      if (!balanceMap.has(empId)) {
        balanceMap.set(empId, []);
      }
      balanceMap.get(empId).push(b);
    });

    const result = activeEmployees.map((emp) => {
      const employeeBalances = balanceMap.get(emp._id.toString()) || [];
      const aggregated = aggregateBalances(employeeBalances, leaveTypes);
      
      return {
        _id: employeeBalances.length > 0 ? employeeBalances[0]._id : null,
        employeeId: emp,
        year,
        ...aggregated,
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
    // allocated is { Annual: 15, Sick: 10, Casual: 10 }
    const leaveTypes = await LeaveType.find();
    
    for (const [key, days] of Object.entries(allocated)) {
      const code = key.toLowerCase();
      const lt = leaveTypes.find(t => t.code === code);
      if (lt) {
        await LeaveBalance.findOneAndUpdate(
          { employeeId, year, leaveType: lt._id },
          { 
            $set: { 
              allocated: days,
              source: 'ManualOverride'
            } 
          },
          { upsert: true, new: true }
        );
      }
    }
    
    // Re-fetch and aggregate to return the expected shape
    const updatedBalances = await LeaveBalance.find({ employeeId, year });
    const aggregated = aggregateBalances(updatedBalances, leaveTypes);
    
    return apiResponse.ok(res, { employeeId, year, ...aggregated }, 'Leave allocation updated');
  } catch (err) {
    return next(err);
  }
};

exports.bulkUpdateAllocation = async (req, res, next) => {
  try {
    const { year, allocated } = req.body;
    // We can either update everyone's manual override, or we can just trigger a sync.
    // Given the refactor spec, bulk refresh is replaced by sync all balances.
    // However, the frontend might send `allocated` object if it uses the same form. 
    // Let's just trigger sync if it's the old bulk refresh action.
    
    const count = await leavePolicyService.syncAllBalancesForYear(year);
    
    return apiResponse.ok(
      res,
      { count },
      `Leave allocation synchronized for ${count} employees`,
    );
  } catch (err) {
    return next(err);
  }
};

// --- Employee Endpoints ---

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ employeeId: req.user.id })
      .populate('leaveType')
      .sort({ createdAt: -1 });
      
    // Format for frontend
    const formattedRequests = requests.map(r => {
      const obj = r.toObject();
      if (obj.leaveType && obj.leaveType.code) {
        obj.leaveType = obj.leaveType.code.charAt(0).toUpperCase() + obj.leaveType.code.slice(1);
      }
      return obj;
    });
    
    return apiResponse.ok(res, formattedRequests);
  } catch (err) {
    return next(err);
  }
};

exports.getMyBalance = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || dayjs().year();
    const balances = await LeaveBalance.find({ employeeId: req.user.id, year }).populate('leaveType');
    const leaveTypes = await LeaveType.find();
    
    const aggregated = aggregateBalances(balances, leaveTypes);

    const list = balances.map(b => {
      if (!b.leaveType) return null;
      const typeCode = b.leaveType.code || '';
      const typeLabel = b.leaveType.name || (typeCode.charAt(0).toUpperCase() + typeCode.slice(1) + ' Leave');
      return {
        leaveType: typeCode.charAt(0).toUpperCase() + typeCode.slice(1),
        leaveTypeDoc: b.leaveType,
        allocated: b.allocated || 0,
        used: b.used || 0,
        remaining: (b.allocated || 0) - (b.used || 0),
      };
    }).filter(Boolean);

    return apiResponse.ok(res, {
      year,
      ...aggregated,
      list,
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
      requestedDays = await calculateWorkingDaysBetween(startDate, endDate);
    }

    if (requestedDays <= 0) {
      return apiResponse.badRequest(res, 'Selected date range contains no working days');
    }
    
    const typeStr = leaveType || 'Annual';
    const leaveTypeDoc = await LeaveType.findOne({ code: typeStr.toLowerCase() });
    if (!leaveTypeDoc) {
      return apiResponse.badRequest(res, `Unknown leave type: ${typeStr}`);
    }

    // Validation 1: Check balance
    if (leaveTypeDoc.deductsFromBalance) {
      const year = start.year();
      
      // Ensure the user actually has a policy assigned for this type
      const balance = await LeaveBalance.findOne({ employeeId, year, leaveType: leaveTypeDoc._id });
      if (!balance) {
         return apiResponse.badRequest(res, `No leave policy assigned for ${typeStr} leave.`);
      }
      
      const remaining = balance.allocated - balance.used;

      if (requestedDays > remaining) {
        return apiResponse.badRequest(
          res,
          `Insufficient leave balance. You are requesting ${requestedDays} days of ${typeStr} leave but only have ${remaining} remaining.`,
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

    let approvalStages;
    try {
      approvalStages = await resolveApprovalStagesForEmployee(employeeId);
    } catch (e) {
      return apiResponse.badRequest(res, e.message);
    }

    const request = new LeaveRequest({
      employeeId,
      startDate: start.toDate(),
      endDate: end.toDate(),
      leaveType: leaveTypeDoc._id,
      reason,
      requestedDays,
      halfDay: !!halfDay,
      status: 'Pending',
      approvalStages,
    });

    await request.save();
    
    const savedRequest = request.toObject();
    savedRequest.leaveType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
    
    return apiResponse.created(res, savedRequest, 'Leave request submitted successfully');
  } catch (err) {
    return next(err);
  }
};

exports.cancelMyRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    const request = await LeaveRequest.findOne({ _id: id, employeeId }).populate('leaveType');
    if (!request) {
      return apiResponse.notFound(res, 'Leave request not found');
    }

    if (request.status === 'Cancelled') {
      return apiResponse.badRequest(res, 'Leave request is already cancelled');
    }

    if (request.status === 'Rejected') {
      return apiResponse.badRequest(res, 'Cannot cancel a rejected leave request');
    }

    if (request.status === 'Approved') {
      const today = dayjs().tz('Asia/Dhaka').startOf('day');
      const start = dayjs(request.startDate).tz('Asia/Dhaka').startOf('day');
      if (start.isBefore(today)) {
        return apiResponse.badRequest(res, 'Cannot cancel an approved leave request that has already started');
      }

      if (request.leaveType && request.leaveType.deductsFromBalance) {
        const year = dayjs(request.startDate).year();
        await LeaveBalance.findOneAndUpdate(
          { employeeId, year, leaveType: request.leaveType._id },
          { $inc: { used: -request.requestedDays } }
        );
      }
    }

    request.status = 'Cancelled';
    await request.save();
    
    const updatedRequest = request.toObject();
    if (updatedRequest.leaveType && updatedRequest.leaveType.code) {
      updatedRequest.leaveType = updatedRequest.leaveType.code.charAt(0).toUpperCase() + updatedRequest.leaveType.code.slice(1);
    }

    return apiResponse.ok(res, updatedRequest, 'Leave request cancelled successfully');
  } catch (err) {
    return next(err);
  }
};
