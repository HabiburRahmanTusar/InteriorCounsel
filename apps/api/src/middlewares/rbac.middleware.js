/**
 * RBAC middleware — role-checker factory.
 * Usage: rbac('admin', 'hr')
 */
const apiResponse = require('../utils/apiResponse');

module.exports = function rbac(...allowedRoles) {
  return function rbacMiddleware(req, res, next) {
    if (!req.user) {
      return apiResponse.unauthorized(res, 'Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return apiResponse.forbidden(res, 'Insufficient role privileges');
    }
    return next();
  };
};
