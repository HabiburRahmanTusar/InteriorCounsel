const express = require('express');
const adminPolicyCtrl = require('../controllers/adminPolicy.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);
router.use(rbac('admin', 'hr'));

// Leave Types
router.post('/leave-types', adminPolicyCtrl.createLeaveType);
router.get('/leave-types', adminPolicyCtrl.getLeaveTypes);
router.patch('/leave-types/:id', adminPolicyCtrl.updateLeaveType);

// Employee Types
router.get('/employee-types', adminPolicyCtrl.getEmployeeTypes);

// Leave Policies
router.post('/leave-policies', adminPolicyCtrl.createPolicy);
router.get('/leave-policies', adminPolicyCtrl.getPolicies);
router.get('/leave-policies/:id', adminPolicyCtrl.getPolicyById);
router.patch('/leave-policies/:id', adminPolicyCtrl.updatePolicy);
router.delete('/leave-policies/:id', adminPolicyCtrl.deletePolicy);

// Policy Actions
router.post('/leave-policies/:id/activate', adminPolicyCtrl.activatePolicy);
router.post('/leave-policies/:id/archive', adminPolicyCtrl.archivePolicy);
router.post('/leave-policies/:id/assign-preview', adminPolicyCtrl.assignPreview);
router.post('/leave-policies/sync-balances', adminPolicyCtrl.syncBalancesBulk);
router.post('/employees/:id/sync-balance', adminPolicyCtrl.syncBalanceSingle);

module.exports = router;
