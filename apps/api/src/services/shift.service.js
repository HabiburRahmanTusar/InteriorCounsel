const Shift = require('../models/Shift');
const User = require('../models/User');

exports.list = async function list() {
  return Shift.find({});
};

exports.create = async function create(payload) {
  return Shift.create(payload);
};

exports.update = async function update(id, payload) {
  const shift = await Shift.findByIdAndUpdate(id, payload, { new: true });
  if (!shift) {
    const error = new Error('Shift not found');
    error.status = 404;
    throw error;
  }
  return shift;
};

exports.remove = async function remove(id) {
  const userCount = await User.countDocuments({ shiftId: id });
  if (userCount > 0) {
    const error = new Error('Cannot delete shift: employees are currently assigned to it');
    error.status = 400;
    throw error;
  }
  const shift = await Shift.findByIdAndDelete(id);
  if (!shift) {
    const error = new Error('Shift not found');
    error.status = 404;
    throw error;
  }
};
