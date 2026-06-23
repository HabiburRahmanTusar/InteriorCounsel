/**
 * Validation middleware factory — wraps a Joi schema.
 * Validates req.body (extend as needed to support params/query).
 *
 * Usage: validate(schemas.create)          // validates req.body
 *        validate(schemas.create, 'query') // validates req.query
 */
const apiResponse = require('../utils/apiResponse');

module.exports = function validate(schema, source = 'body') {
  if (!schema) {
    throw new Error('validate middleware requires a Joi schema');
  }
  return function validateMiddleware(req, res, next) {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const err = error;
      err.status = 422;
      err.isJoi = true;
      err.details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      return next(err);
    }
    req[source] = value;
    return next();
  };
};
