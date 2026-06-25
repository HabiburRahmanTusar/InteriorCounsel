/**
 * Report routes — see build plan §6 Reports.
 */
const express = require('express');

const ctrl = require('../controllers/report.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/report.validator');

const router = express.Router();

router.use(auth, rbac('admin', 'hr'));

router.get('/daily', validate(schemas.daily, 'query'), ctrl.daily);
router.get('/monthly', validate(schemas.monthly, 'query'), ctrl.monthly);
router.get('/export', validate(schemas.exportReport, 'query'), ctrl.exportReport);
router.get('/employee-wise', validate(schemas.employeeWise, 'query'), ctrl.employeeWise);
router.get(
  '/employee-wise/export',
  validate(schemas.exportEmployeeWise, 'query'),
  ctrl.exportEmployeeWise,
);
router.get('/leave-wise', validate(schemas.leaveWise, 'query'), ctrl.leaveWise);
router.get(
  '/leave-wise/export',
  validate(schemas.exportLeaveWise, 'query'),
  ctrl.exportLeaveWise,
);

module.exports = router;
