/**
 * Shift routes — see build plan §6 Shifts.
 */
const express = require('express');

const ctrl = require('../controllers/shift.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/shift.validator');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin', 'hr'), ctrl.list);
router.post('/', rbac('admin'), validate(schemas.create), ctrl.create);
router.put('/:id', rbac('admin'), validate(schemas.update), ctrl.update);
router.delete('/:id', rbac('admin'), ctrl.remove);

module.exports = router;
