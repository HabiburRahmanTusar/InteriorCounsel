const LeaveType = require('../models/LeaveType');
const LeavePolicy = require('../models/LeavePolicy');
const EmployeeType = require('../models/EmployeeType');
const User = require('../models/User');
const leavePolicyService = require('../services/leavePolicy.service');
const apiResponse = require('../utils/apiResponse');

// --- LeaveType Endpoints ---
exports.createLeaveType = async (req, res, next) => {
  try {
    const leaveType = new LeaveType(req.body);
    await leaveType.save();
    return apiResponse.created(res, leaveType, 'Leave type created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.getLeaveTypes = async (req, res, next) => {
  try {
    const types = await LeaveType.find();
    return apiResponse.ok(res, types);
  } catch (err) {
    return next(err);
  }
};

exports.updateLeaveType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leaveType = await LeaveType.findByIdAndUpdate(id, req.body, { new: true });
    if (!leaveType) return apiResponse.notFound(res, 'Leave type not found');
    return apiResponse.ok(res, leaveType, 'Leave type updated');
  } catch (err) {
    return next(err);
  }
};

// --- EmployeeType Endpoints ---
exports.getEmployeeTypes = async (req, res, next) => {
  try {
    const types = await EmployeeType.find();
    return apiResponse.ok(res, types);
  } catch (err) {
    return next(err);
  }
};

// --- LeavePolicy Endpoints ---
exports.createPolicy = async (req, res, next) => {
  try {
    const policy = new LeavePolicy({
      ...req.body,
      createdBy: req.user.id
    });
    await policy.save();
    return apiResponse.created(res, policy, 'Leave policy created');
  } catch (err) {
    return next(err);
  }
};

exports.getPolicies = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.year) filter.year = req.query.year;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.employeeType) filter.employeeTypes = req.query.employeeType;

    const policies = await LeavePolicy.find(filter)
      .populate('employeeTypes')
      .populate('leaveAllocations.leaveType');
    return apiResponse.ok(res, policies);
  } catch (err) {
    return next(err);
  }
};

exports.getPolicyById = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id)
      .populate('employeeTypes')
      .populate('leaveAllocations.leaveType');
    if (!policy) return apiResponse.notFound(res, 'Policy not found');
    return apiResponse.ok(res, policy);
  } catch (err) {
    return next(err);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    if (!policy) return apiResponse.notFound(res, 'Policy not found');

    Object.assign(policy, req.body);
    await policy.save();
    
    return apiResponse.ok(res, policy, 'Policy updated');
  } catch (err) {
    return next(err);
  }
};

exports.activatePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    if (!policy) return apiResponse.notFound(res, 'Policy not found');

    if (policy.leaveAllocations.length === 0) {
      return apiResponse.badRequest(res, 'A policy cannot go Active if it has zero leave allocations.');
    }

    policy.status = 'Active';
    await policy.save();
    return apiResponse.ok(res, policy, 'Policy activated');
  } catch (err) {
    return next(err);
  }
};

exports.archivePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findByIdAndUpdate(req.params.id, { status: 'Archived' }, { new: true });
    if (!policy) return apiResponse.notFound(res, 'Policy not found');
    return apiResponse.ok(res, policy, 'Policy archived');
  } catch (err) {
    return next(err);
  }
};

exports.assignPreview = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    if (!policy) return apiResponse.notFound(res, 'Policy not found');

    let query = { status: 'active' };
    if (policy.employeeTypes && policy.employeeTypes.length > 0) {
      query.employeeType = { $in: policy.employeeTypes };
    }

    const employees = await User.find(query).select('name employeeId designation');
    return apiResponse.ok(res, { policy, employeeCount: employees.length, employees });
  } catch (err) {
    return next(err);
  }
};

exports.syncBalancesBulk = async (req, res, next) => {
  try {
    const { year } = req.body;
    if (!year) return apiResponse.badRequest(res, 'Year is required');

    const count = await leavePolicyService.syncAllBalancesForYear(year);
    return apiResponse.ok(res, { count }, `Synced balances for ${count} employees for year ${year}`);
  } catch (err) {
    return next(err);
  }
};

exports.syncBalanceSingle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { year } = req.body;
    if (!year) return apiResponse.badRequest(res, 'Year is required');

    const policy = await leavePolicyService.syncEmployeeBalance(id, year);
    if (!policy) {
      return apiResponse.badRequest(res, 'No applicable policy found for employee');
    }
    return apiResponse.ok(res, { policy: policy.name }, 'Employee balance synced successfully');
  } catch (err) {
    return next(err);
  }
};

exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    if (!policy) return apiResponse.notFound(res, 'Policy not found');
    await LeavePolicy.findByIdAndDelete(req.params.id);
    return apiResponse.ok(res, null, 'Policy deleted successfully');
  } catch (err) {
    return next(err);
  }
};
