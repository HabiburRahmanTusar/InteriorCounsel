const express = require('express');
const ctrl = require('../controllers/leave.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/requests', rbac('admin', 'hr', 'manager'), ctrl.getRequests);
router.post('/requests', rbac('admin', 'hr'), ctrl.createRequest); // Admins can create on behalf of employees for now
router.put('/requests/:id/status', rbac('admin', 'hr', 'manager'), ctrl.updateRequestStatus);

router.get('/balances', rbac('admin', 'hr'), ctrl.getBalances);
router.put('/balances/allocation', rbac('admin', 'hr'), ctrl.updateAllocation);
router.put('/balances/bulk-allocation', rbac('admin', 'hr'), ctrl.bulkUpdateAllocation);

// Employee routes for all roles
router.get('/me/requests', ctrl.getMyRequests);
router.get('/me/balance', ctrl.getMyBalance);
router.post('/me/request', ctrl.submitMyRequest);
router.post('/me/requests/:id/cancel', ctrl.cancelMyRequest);

module.exports = router;
