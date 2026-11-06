const express = require('express');
const ctrl = require('../controllers/cashFlow.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

// Cash In (Customer collections & receipts)
router.get('/in', rbac('admin', 'hr', 'manager'), ctrl.listCashIn);
router.post('/in', rbac('admin', 'hr', 'manager'), ctrl.recordCashIn);
router.delete('/in/:id', rbac('admin'), ctrl.deleteCashIn);

// Cash Out (Disbursements, expenses, salary payouts, vendor payments)
router.get('/out', rbac('admin', 'hr', 'manager'), ctrl.listCashOut);
router.post('/out', rbac('admin', 'hr', 'manager'), ctrl.recordCashOut);
router.delete('/out/:id', rbac('admin'), ctrl.deleteCashOut);

module.exports = router;
