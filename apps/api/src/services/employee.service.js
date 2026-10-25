const User = require('../models/User');
const Attendance = require('../models/Attendance');
const DeductionLog = require('../models/DeductionLog');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const SalaryRecord = require('../models/SalaryRecord');
const RefreshToken = require('../models/RefreshToken');

exports.list = async function list({ page, limit, search, status }) {
  const query = {};

  if (search) {
    const rx = new RegExp(search, 'i');
    query.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
  }
  if (status) {
    query.status = status;
  }

  const total = await User.countDocuments(query);
  const items = await User.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('shiftId')
    .populate('employeeType')
    .sort({ createdAt: -1 });

  return {
    items,
    total,
  };
};

exports.getById = async function getById(id) {
  const user = await User.findById(id).populate('shiftId').populate('employeeType');
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user.toSafeJSON();
};

exports.create = async function create(payload) {
  // Check unique constraints
  const emailExists = await User.findOne({ email: payload.email });
  if (emailExists) {
    const error = new Error('Email is already taken');
    error.status = 400;
    throw error;
  }

  // Auto-generate sequential employee ID if not provided
  if (!payload.employeeId || !payload.employeeId.trim()) {
    const lastUser = await User.findOne({ employeeId: /^EMP\d+$/ }).sort({ employeeId: -1 });
    let nextNum = 1;
    if (lastUser) {
      const match = lastUser.employeeId.match(/^EMP(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    payload.employeeId = `EMP${String(nextNum).padStart(5, '0')}`;
  } else {
    payload.employeeId = payload.employeeId.trim().toUpperCase();
    const idExists = await User.findOne({ employeeId: payload.employeeId });
    if (idExists) {
      const error = new Error(`Employee ID "${payload.employeeId}" is already taken`);
      error.status = 400;
      throw error;
    }
  }

  // Set the password to the employee ID or default
  if (!payload.password) {
    payload.password = payload.employeeId || 'Attendly@123';
  }

  const user = await User.create(payload);
  return user.toSafeJSON();
};

exports.update = async function update(id, payload) {
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (payload.email && payload.email !== user.email) {
    const exists = await User.findOne({ email: payload.email });
    if (exists) {
      const error = new Error('Email is already taken');
      error.status = 400;
      throw error;
    }
  }

  if (payload.employeeId && payload.employeeId !== user.employeeId) {
    const exists = await User.findOne({ employeeId: payload.employeeId });
    if (exists) {
      const error = new Error('Employee ID is already taken');
      error.status = 400;
      throw error;
    }
  }

  Object.assign(user, payload);
  await user.save();
  return user.toSafeJSON();
};

exports.remove = async function remove(id) {
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  if (user.role === 'admin') {
    const error = new Error('Cannot delete admin users');
    error.status = 403;
    throw error;
  }

  // Delete all related employee data cascade
  await Promise.all([
    Attendance.deleteMany({ employeeId: id }),
    DeductionLog.deleteMany({ employeeId: id }),
    LeaveBalance.deleteMany({ employeeId: id }),
    LeaveRequest.deleteMany({ employeeId: id }),
    SalaryRecord.deleteMany({ employeeId: id }),
    RefreshToken.deleteMany({ userId: id }),
    user.deleteOne(),
  ]);
};

exports.assignShift = async function assignShift(id, shiftId) {
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  user.shiftId = shiftId;
  await user.save();
  return user.toSafeJSON();
};
