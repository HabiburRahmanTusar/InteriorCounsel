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
router.use('/holidays', require('./holiday.routes'));
router.use('/salary', require('./salary.routes'));
router.use('/leaves', require('./leave.routes'));
router.use('/financial', require('./financial.routes'));

module.exports = router;
