/**
 * Centralised configuration loader.
 * Reads env vars, applies defaults, and exposes typed config object.
 */
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/workforce_management',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  },
  passwordReset: {
    tokenExpiresInMin: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MIN || '15', 10),
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'no-reply@company.com',
  },
  defaults: {
    gracePeriodMinutes: parseInt(process.env.DEFAULT_GRACE_PERIOD_MINUTES || '15', 10),
    officeRadiusMeters: parseInt(process.env.DEFAULT_OFFICE_RADIUS_METERS || '100', 10),
    timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Dhaka',
  },
};

module.exports = config;
