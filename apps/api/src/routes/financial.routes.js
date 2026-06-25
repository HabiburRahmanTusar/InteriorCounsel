const express = require('express');

const ctrl = require('../controllers/financial.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/financial.validator');

const router = express.Router();

// Apply authentication to all endpoints in this router
router.use(auth);

// All financial endpoints are restricted to admin role
router.get('/', rbac('admin'), ctrl.list);
router.get('/latest', rbac('admin'), ctrl.getLatest);
router.get('/:id', rbac('admin'), ctrl.getById);
router.post('/', rbac('admin'), validate(schemas.createFinancialRecord), ctrl.create);
router.put('/:id', rbac('admin'), validate(schemas.updateFinancialRecord), ctrl.update);
router.delete('/:id', rbac('admin'), ctrl.remove);

module.exports = router;
