/**
 * Attendance routes — see build plan §6 Attendance.
 */
const express = require('express');

const ctrl = require('../controllers/attendance.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/attendance.validator');

const router = express.Router();

router.use(auth);

router.get('/status', ctrl.status);
router.post('/check-in', validate(schemas.checkIn), ctrl.checkIn);
router.post('/check-out', validate(schemas.checkOut), ctrl.checkOut);
router.get('/history', validate(schemas.history), ctrl.history);
router.get('/daily', rbac('admin', 'hr', 'manager'), validate(schemas.daily), ctrl.daily);

module.exports = router;
