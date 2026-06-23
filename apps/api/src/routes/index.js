/**
 * Route registry — mounts each feature router under /api.
 */
const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/employees', require('./employee.routes'));
router.use('/shifts', require('./shift.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/reports', require('./report.routes'));
router.use('/settings', require('./settings.routes'));

module.exports = router;
