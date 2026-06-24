const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const config = require('../config');

exports.login = async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  if (user.status !== 'active') {
    const error = new Error('Your account is deactivated');
    error.status = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const accessToken = jwt.sign(
    { sub: user._id, role: user.role, employeeId: user.employeeId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );

  const refreshToken = jwt.sign({ sub: user._id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt,
  });

  return {
    id: user._id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    accessToken,
    refreshToken,
  };
};

exports.logout = async function logout({ refreshToken }) {
  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }
};

exports.rotateRefreshToken = async function rotateRefreshToken({ refreshToken }) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.status = 401;
    throw error;
  }

  const existingToken = await RefreshToken.findOne({ token: refreshToken });
  if (!existingToken) {
    const error = new Error('Refresh token not found or already used');
    error.status = 401;
    throw error;
  }

  await RefreshToken.deleteOne({ token: refreshToken });

  const user = await User.findById(decoded.sub);
  if (!user || user.status !== 'active') {
    const error = new Error('User not found or deactivated');
    error.status = 401;
    throw error;
  }

  const newAccessToken = jwt.sign(
    { sub: user._id, role: user.role, employeeId: user.employeeId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );

  const newRefreshToken = jwt.sign({ sub: user._id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId: user._id,
    token: newRefreshToken,
    expiresAt,
  });

  return {
    id: user._id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

exports.forgotPassword = async function forgotPassword({ email }) {
  const user = await User.findOne({ email });
  if (!user) {
    return;
  }
  console.log(`Password reset requested for email: ${email}`);
};

exports.resetPassword = async function resetPassword({ resetToken, newPassword }) {
  console.log(`Resetting password with token: ${resetToken}`);
};

exports.me = async function me(userId) {
  const user = await User.findById(userId).populate('shiftId');
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user.toSafeJSON();
};

exports.changePassword = async function changePassword(userId, { oldPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    const error = new Error('Invalid old password');
    error.status = 400;
    throw error;
  }

  user.password = newPassword;
  await user.save();
};
