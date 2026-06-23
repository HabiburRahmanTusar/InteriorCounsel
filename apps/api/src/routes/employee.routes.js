/**
 * Employee routes — see build plan §6 Employees.
 */
const express = require('express');

const ctrl = require('../controllers/employee.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/employee.validator');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin', 'hr', 'manager'), validate(schemas.list), ctrl.list);
router.get('/:id', rbac('admin', 'hr'), ctrl.getById);
router.post('/', rbac('admin', 'hr'), validate(schemas.create), ctrl.create);
router.put('/:id', rbac('admin', 'hr'), validate(schemas.update), ctrl.update);
router.delete('/:id', rbac('admin'), ctrl.deactivate);
router.put('/:id/shift', rbac('admin', 'hr'), validate(schemas.assignShift), ctrl.assignShift);
router.put(
  '/:id/department',
  rbac('admin', 'hr'),
  validate(schemas.assignDepartment),
  ctrl.assignDepartment,
);

module.exports = router;
