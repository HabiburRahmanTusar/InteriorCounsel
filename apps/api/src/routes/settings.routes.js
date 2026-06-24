/**
 * Settings routes — see build plan §6 Settings.
 */
const express = require('express');

const ctrl = require('../controllers/settings.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/settings.validator');

const router = express.Router();

router.use(auth);

router.put(
  '/attendance-rules',
  rbac('admin'),
  validate(schemas.updateAttendanceRules),
  ctrl.updateAttendanceRules,
);
router.get('/company', rbac('admin'), ctrl.getCompany);
router.put('/company', rbac('admin'), validate(schemas.updateCompany), ctrl.updateCompany);
router.get('/work-calendar', rbac('admin', 'hr'), ctrl.getWorkCalendar);
router.put('/work-calendar', rbac('admin', 'hr'), ctrl.updateWorkCalendar);

module.exports = router;
