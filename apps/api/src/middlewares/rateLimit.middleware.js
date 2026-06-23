/**
 * Rate-limit presets for different endpoint classes.
 * Wires express-rate-limit with config-driven values.
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');

const standard = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});

const auth = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { standard, auth };
