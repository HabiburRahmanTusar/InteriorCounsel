/**
 * Auth service — business logic for authentication.
 * Stubbed; implement later per build plan §7 (Authentication).
 */

exports.login = async function login({ email, password }) {
  // TODO: validate user, verify password, issue access + refresh tokens
  throw new Error('auth.service.login not implemented');
};

exports.logout = async function logout({ refreshToken }) {
  // TODO: invalidate refresh token in DB
  throw new Error('auth.service.logout not implemented');
};

exports.rotateRefreshToken = async function rotateRefreshToken({ refreshToken }) {
  // TODO: verify, delete old, issue new (rotation per §11 risk #4)
  throw new Error('auth.service.rotateRefreshToken not implemented');
};

exports.forgotPassword = async function forgotPassword({ email }) {
  // TODO: generate short-lived reset token, send email via nodemailer
  throw new Error('auth.service.forgotPassword not implemented');
};

exports.resetPassword = async function resetPassword({ resetToken, newPassword }) {
  // TODO: validate token, hash new password, invalidate token
  throw new Error('auth.service.resetPassword not implemented');
};
