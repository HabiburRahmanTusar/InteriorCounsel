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

module.exports = router;
