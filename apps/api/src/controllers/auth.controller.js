const authService = require('../services/auth.service');
const apiResponse = require('../utils/apiResponse');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login({ email, password });
    return apiResponse.ok(res, data, 'Login successful');
  } catch (err) {
    return next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout({ refreshToken });
    return apiResponse.noContent(res);
  } catch (err) {
    return next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.rotateRefreshToken({ refreshToken });
    return apiResponse.ok(res, data, 'Tokens rotated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword({ email });
    return apiResponse.ok(res, null, 'If that email exists, reset link has been logged.');
  } catch (err) {
    return next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    await authService.resetPassword({ resetToken, newPassword });
    return apiResponse.ok(res, null, 'Password reset successful');
  } catch (err) {
    return next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const data = await authService.me(req.user.id);
    return apiResponse.ok(res, data, 'Profile retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { oldPassword, newPassword });
    return apiResponse.ok(res, null, 'Password changed successfully');
  } catch (err) {
    return next(err);
  }
};
