/**
 * Auth middleware — verifies JWT access token and loads req.user.
 * Business logic NOT implemented yet.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const apiResponse = require('../utils/apiResponse');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return apiResponse.unauthorized(res, 'Missing or malformed Authorization header');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = { id: decoded.sub, role: decoded.role, employeeId: decoded.employeeId };
    return next();
  } catch (err) {
    return apiResponse.unauthorized(res, 'Invalid or expired access token');
  }
};
