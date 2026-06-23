/**
 * Department routes — see build plan §5 Departments.
 */
const express = require('express');

const ctrl = require('../controllers/department.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/department.validator');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin', 'hr', 'manager'), ctrl.list);
router.post('/', rbac('admin', 'hr'), validate(schemas.create), ctrl.create);
router.put('/:id', rbac('admin', 'hr'), validate(schemas.update), ctrl.update);
router.delete('/:id', rbac('admin'), ctrl.remove);

module.exports = router;
