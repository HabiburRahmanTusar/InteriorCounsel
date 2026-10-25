const express = require('express');
const ctrl = require('../controllers/bankTransfer.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin', 'hr', 'manager'), ctrl.listTransfers);
router.post('/', rbac('admin', 'hr', 'manager'), ctrl.createTransfer);
router.get('/:id', rbac('admin', 'hr', 'manager'), ctrl.getTransferById);
router.delete('/:id', rbac('admin'), ctrl.deleteTransfer);

module.exports = router;
