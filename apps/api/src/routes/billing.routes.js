const express = require('express');
const ctrl = require('../controllers/billing.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin', 'hr', 'manager'), ctrl.list);
router.get('/:id', rbac('admin', 'hr', 'manager'), ctrl.getById);
router.get('/:id/lines-for-vendor', rbac('admin', 'hr', 'manager'), ctrl.getLinesForVendor);
router.post('/', rbac('admin', 'hr', 'manager'), ctrl.create);
router.put('/:id', rbac('admin', 'hr', 'manager'), ctrl.update);
router.delete('/:id', rbac('admin'), ctrl.delete);

module.exports = router;
