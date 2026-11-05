const express = require('express');
const ctrl = require('../controllers/shareholder.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin'), ctrl.list);
router.post('/', rbac('admin'), ctrl.createOrUpdate);
router.get('/portal-summary', rbac('admin', 'shareholder', 'hr', 'manager'), ctrl.getPortalSummary);
router.post('/request-withdrawal', rbac('admin', 'shareholder'), ctrl.requestWithdrawal);
router.get('/wallet/:shareholderId?', rbac('admin', 'hr', 'manager', 'employee', 'shareholder'), ctrl.getWallet);
router.put('/percentage/:shareholderId', rbac('admin'), ctrl.updateSharePercentage);
router.delete('/:shareholderId', rbac('admin'), ctrl.remove);
router.get('/monthly-profit', rbac('admin', 'shareholder', 'hr', 'manager'), ctrl.calculateProfit);
router.post('/distribute-profit', rbac('admin'), ctrl.distributeProfit);

module.exports = router;
