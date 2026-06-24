const express = require('express');
const ctrl = require('../controllers/leave.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/requests', rbac('admin', 'hr'), ctrl.getRequests);
router.post('/requests', rbac('admin', 'hr'), ctrl.createRequest); // Admins can create on behalf of employees for now
router.put('/requests/:id/status', rbac('admin', 'hr'), ctrl.updateRequestStatus);

router.get('/balances', rbac('admin', 'hr'), ctrl.getBalances);
router.put('/balances/allocation', rbac('admin', 'hr'), ctrl.updateAllocation);
router.put('/balances/bulk-allocation', rbac('admin', 'hr'), ctrl.bulkUpdateAllocation);

// Employee routes
router.get('/me/requests', rbac('employee'), ctrl.getMyRequests);
router.get('/me/balance', rbac('employee'), ctrl.getMyBalance);
router.post('/me/request', rbac('employee'), ctrl.submitMyRequest);

module.exports = router;
