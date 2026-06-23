/**
 * Auth routes — see build plan §6 Authentication.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');

const ctrl = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/auth.validator');
const config = require('../config');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validate(schemas.login), ctrl.login);
router.post('/logout', auth, ctrl.logout);
router.post('/refresh-token', validate(schemas.refreshToken), ctrl.refreshToken);
router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate(schemas.resetPassword), ctrl.resetPassword);

module.exports = router;
