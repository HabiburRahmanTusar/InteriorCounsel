const express = require('express');
const ctrl = require('../controllers/quotation.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin', 'hr', 'manager'), ctrl.list);
router.post('/', rbac('admin', 'hr', 'manager'), ctrl.create);
router.get('/:id', rbac('admin', 'hr', 'manager'), ctrl.getById);
router.put('/:id', rbac('admin', 'hr', 'manager'), ctrl.update);
router.delete('/:id', rbac('admin'), ctrl.delete);
router.post('/:id/convert-to-bill', rbac('admin', 'manager'), ctrl.convertToBill);

module.exports = router;
