/**
 * Central error handler — converts thrown errors into a consistent JSON shape.
 * Must be mounted as the last middleware in app.js.
 */
const logger = require('../utils/logger');
const config = require('../config');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal server error',
  };

  if (err.isJoi) {
    payload.message = 'Validation error';
    payload.details = err.details;
  }

  if (status >= 500) {
    logger.error(err.stack || err.message);
    if (config.env === 'production') {
      payload.message = 'Internal server error';
    } else {
      payload.stack = err.stack;
    }
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
