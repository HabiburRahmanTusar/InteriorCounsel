/**
 * Attendance routes — see build plan §6 Attendance + Odoo HR Attendance & Late Rules.
 */
const express = require('express');

const ctrl = require('../controllers/attendance.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/attendance.validator');

const router = express.Router();

router.use(auth);

router.get('/status', ctrl.getStatus);
router.post('/check-in', validate(schemas.checkIn), ctrl.checkIn);
router.post('/check-out', validate(schemas.checkOut), ctrl.checkOut);
router.get('/history', validate(schemas.history, 'query'), ctrl.history);
router.get('/daily', rbac('admin', 'hr', 'manager'), validate(schemas.daily, 'query'), ctrl.daily);

// Odoo daily attendance actions & salary deduction calculations
router.post('/roster/today', rbac('admin', 'hr'), ctrl.generateTodayRoster);
router.post('/manual', rbac('admin', 'hr'), ctrl.recordManual);
router.get('/manual', rbac('admin', 'hr', 'manager'), ctrl.getManualList);
router.delete('/manual/:id', rbac('admin', 'hr'), ctrl.deleteManual);
router.get('/salary-summary/:employeeId?', rbac('admin', 'hr', 'manager', 'employee'), ctrl.getSalarySummary);

module.exports = router;
