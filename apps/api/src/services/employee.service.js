const User = require('../models/User');

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
    .sort({ createdAt: -1 });

  return {
    items,
    total,
  };
};

exports.getById = async function getById(id) {
  const user = await User.findById(id)
    .populate('shiftId');
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

  // Auto-generate sequential employee ID
  const lastUser = await User.findOne({ employeeId: /^EMP\d+$/ }).sort({ employeeId: -1 });
  let nextNum = 1;
  if (lastUser) {
    const match = lastUser.employeeId.match(/^EMP(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  payload.employeeId = `EMP${String(nextNum).padStart(5, '0')}`;

  // Set the password to the generated employee ID
  payload.password = payload.employeeId;

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
  await user.deleteOne();
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
