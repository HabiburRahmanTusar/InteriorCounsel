const express = require('express');
const ctrl = require('../controllers/salary.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth, rbac('admin', 'hr'));

router.get('/overview', ctrl.overview);
router.get('/reports', ctrl.reports);
router.post('/recalculate', ctrl.recalculate);
router.post('/pay/:id', ctrl.pay);
router.get('/deductions', ctrl.deductions);

module.exports = router;
