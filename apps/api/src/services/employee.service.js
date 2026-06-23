const User = require('../models/User');

exports.list = async function list({ page, limit, search, departmentId, status }) {
  const query = {};

  if (search) {
    const rx = new RegExp(search, 'i');
    query.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
  }
  if (departmentId) {
    query.departmentId = departmentId;
  }
  if (status) {
    query.status = status;
  }

  const total = await User.countDocuments(query);
  const items = await User.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('shiftId')
    .populate('departmentId')
    .populate('officeLocationId')
    .sort({ createdAt: -1 });

  return {
    items,
    total,
  };
};

exports.getById = async function getById(id) {
  const user = await User.findById(id)
    .populate('shiftId')
    .populate('departmentId')
    .populate('officeLocationId');
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

  const empIdExists = await User.findOne({ employeeId: payload.employeeId });
  if (empIdExists) {
    const error = new Error('Employee ID is already taken');
    error.status = 400;
    throw error;
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

exports.deactivate = async function deactivate(id) {
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  user.status = 'inactive';
  await user.save();
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

exports.assignDepartment = async function assignDepartment(id, departmentId) {
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  user.departmentId = departmentId;
  await user.save();
  return user.toSafeJSON();
};
